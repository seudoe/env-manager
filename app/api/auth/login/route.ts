import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { verifyPassword, createSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  logger.info("auth/login", "Login attempt", { ip });

  try {
    const rl = rateLimit(`auth:login:${ip}`, "auth");
    if (!rl.success) {
      logger.warn("auth/login", "Rate limited", { ip });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      logger.warn("auth/login", "Missing fields", { hasUsername: !!username, hasPassword: !!password });
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const usernameClean = username.trim().toLowerCase();

    logger.info("auth/login", "Connecting to database...");
    await dbConnect();

    logger.info("auth/login", "Looking up user", { username: usernameClean });
    const user = await User.findOne({ username: usernameClean });
    if (!user) {
      logger.warn("auth/login", "User not found", { username: usernameClean });
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    logger.info("auth/login", "Verifying password...", { userId: user._id.toString() });
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      logger.warn("auth/login", "Invalid password", { username: usernameClean });
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    logger.info("auth/login", "Password verified, creating session...", { userId: user._id.toString() });
    await createSession({
      userId: user._id.toString(),
      username: user.username,
    });

    logger.info("auth/login", "Login successful", { userId: user._id.toString(), username: user.username });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
      },
    });
  } catch (error) {
    logger.error("auth/login", "Login failed", { error: (error as Error).message });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
