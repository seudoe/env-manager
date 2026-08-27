import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  logger.info("auth/register", "Registration attempt", { ip });

  try {
    const rl = rateLimit(`auth:register:${ip}`, "auth");
    if (!rl.success) {
      logger.warn("auth/register", "Rate limited", { ip });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      logger.warn("auth/register", "Missing fields", { hasUsername: !!username, hasPassword: !!password });
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    if (typeof username !== "string" || username.trim().length < 3 || username.trim().length > 30) {
      logger.warn("auth/register", "Invalid username length", { length: username?.length });
      return NextResponse.json(
        { error: "Username must be between 3 and 30 characters." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      logger.warn("auth/register", "Password too short");
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const usernameClean = username.trim().toLowerCase();

    logger.info("auth/register", "Connecting to database...");
    await dbConnect();

    logger.info("auth/register", "Checking for existing user", { username: usernameClean });
    const existing = await User.findOne({ username: usernameClean });
    if (existing) {
      logger.warn("auth/register", "Username already taken", { username: usernameClean });
      return NextResponse.json(
        { error: "Username already taken." },
        { status: 409 }
      );
    }

    logger.info("auth/register", "Hashing password...");
    const passwordHash = await hashPassword(password);

    logger.info("auth/register", "Creating user...", { username: usernameClean });
    const user = await User.create({
      username: usernameClean,
      passwordHash,
    });

    logger.info("auth/register", "User created successfully", { userId: user._id.toString(), username: user.username });

    logger.info("auth/register", "Creating session...");
    await createSession({
      userId: user._id.toString(),
      username: user.username,
    });

    logger.info("auth/register", "Registration complete", { userId: user._id.toString(), username: user.username });

    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          username: user.username,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("auth/register", "Registration failed", { error: (error as Error).message });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
