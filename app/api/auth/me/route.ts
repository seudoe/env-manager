import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function GET() {
  logger.info("auth/me", "Fetching current user session");

  try {
    const session = await getSession();
    if (!session) {
      logger.warn("auth/me", "No valid session found");
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }

    logger.info("auth/me", "Session valid", { userId: session.userId, username: session.username });

    return NextResponse.json({
      user: {
        id: session.userId,
        username: session.username,
      },
    });
  } catch (error) {
    logger.error("auth/me", "Failed to fetch session", { error: (error as Error).message });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
