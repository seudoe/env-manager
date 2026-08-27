import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Project from "@/models/Project";
import { getSession, hashPassword, verifyPassword, createSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function PATCH(request: NextRequest) {
  logger.info("user/profile", "Profile update request");

  try {
    const session = await getSession();
    if (!session) {
      logger.warn("user/profile", "Unauthorized — no session");
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    logger.info("user/profile", "Authenticated user", { userId: session.userId, username: session.username });

    const { username, currentPassword, newPassword } = await request.json();

    await dbConnect();

    logger.info("user/profile", "Fetching user from database", { userId: session.userId });
    const user = await User.findById(session.userId);
    if (!user) {
      logger.error("user/profile", "User not found in database", { userId: session.userId });
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Change username
    if (username && typeof username === "string") {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        logger.warn("user/profile", "Invalid username length", { length: cleanUsername.length });
        return NextResponse.json(
          { error: "Username must be between 3 and 30 characters." },
          { status: 400 }
        );
      }

      if (cleanUsername !== user.username) {
        logger.info("user/profile", "Checking username availability", { newUsername: cleanUsername });
        const existing = await User.findOne({ username: cleanUsername });
        if (existing) {
          logger.warn("user/profile", "Username already taken", { newUsername: cleanUsername });
          return NextResponse.json(
            { error: "Username already taken." },
            { status: 409 }
          );
        }

        const oldUsername = user.username;
        user.username = cleanUsername;
        await user.save();
        logger.info("user/profile", "Username updated", { oldUsername, newUsername: cleanUsername });

        logger.info("user/profile", "Updating denormalized usernames in projects...");
        await Project.updateMany(
          { ownerId: session.userId },
          { ownerUsername: cleanUsername }
        );
        await Project.updateMany(
          { "contributors.userId": session.userId },
          { $set: { "contributors.$.username": cleanUsername } }
        );
        logger.info("user/profile", "Denormalized usernames updated");

        logger.info("user/profile", "Refreshing session with new username");
        await createSession({
          userId: session.userId,
          username: cleanUsername,
        });

        if (!newPassword) {
          return NextResponse.json({
            success: true,
            username: cleanUsername,
            message: `Username changed from '${oldUsername}' to '${cleanUsername}'.`,
          });
        }
      }
    }

    // Change password
    if (newPassword && typeof newPassword === "string") {
      if (!currentPassword) {
        logger.warn("user/profile", "Missing current password for password change");
        return NextResponse.json(
          { error: "Current password is required to change password." },
          { status: 400 }
        );
      }

      logger.info("user/profile", "Verifying current password...", { userId: session.userId });
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        logger.warn("user/profile", "Current password incorrect", { userId: session.userId });
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 }
        );
      }

      if (newPassword.length < 6) {
        logger.warn("user/profile", "New password too short");
        return NextResponse.json(
          { error: "New password must be at least 6 characters." },
          { status: 400 }
        );
      }

      logger.info("user/profile", "Hashing new password...");
      user.passwordHash = await hashPassword(newPassword);
      await user.save();
      logger.info("user/profile", "Password updated successfully", { userId: session.userId });

      logger.info("user/profile", "Refreshing session after password change");
      await createSession({
        userId: session.userId,
        username: user.username,
      });
    }

    logger.info("user/profile", "Profile update complete", { userId: session.userId });
    return NextResponse.json({
      success: true,
      username: user.username,
    });
  } catch (error) {
    logger.error("user/profile", "Profile update failed", { error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
