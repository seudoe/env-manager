import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Project from "@/models/Project";
import { getSession, hashPassword, verifyPassword, createSession } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { username, currentPassword, newPassword } = await request.json();

    await dbConnect();

    const user = await User.findById(session.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Change username
    if (username && typeof username === "string") {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return NextResponse.json(
          { error: "Username must be between 3 and 30 characters." },
          { status: 400 }
        );
      }

      if (cleanUsername !== user.username) {
        const existing = await User.findOne({ username: cleanUsername });
        if (existing) {
          return NextResponse.json(
            { error: "Username already taken." },
            { status: 409 }
          );
        }

        const oldUsername = user.username;
        user.username = cleanUsername;
        await user.save();

        // Update denormalized usernames in projects
        await Project.updateMany(
          { ownerId: session.userId },
          { ownerUsername: cleanUsername }
        );
        await Project.updateMany(
          { "contributors.userId": session.userId },
          { $set: { "contributors.$.username": cleanUsername } }
        );

        // Update session with new username
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
        return NextResponse.json(
          { error: "Current password is required to change password." },
          { status: 400 }
        );
      }

      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 401 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters." },
          { status: 400 }
        );
      }

      user.passwordHash = await hashPassword(newPassword);
      await user.save();

      // Re-create session (invalidate old one)
      await createSession({
        userId: session.userId,
        username: user.username,
      });
    }

    return NextResponse.json({
      success: true,
      username: user.username,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
