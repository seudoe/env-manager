import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST() {
  logger.info("auth/logout", "Logout requested");

  try {
    await destroySession();
    logger.info("auth/logout", "Session destroyed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("auth/logout", "Logout failed", { error: (error as Error).message });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
