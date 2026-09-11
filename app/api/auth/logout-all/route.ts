import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getSession, destroySession } from "@/lib/auth";
import { logger } from "@/lib/logger";

// POST — invalidate every session for the current user, including the one
// making this request. Bumps tokenVersion so all previously issued JWTs
// (this device and any other) are rejected by getSession() on their next
// use, then clears the current browser's cookie for good measure.
export async function POST() {
  logger.info("auth/logout-all", "Sign-out-everywhere requested");

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    await dbConnect();
    await User.findByIdAndUpdate(session.userId, { $inc: { tokenVersion: 1 } });
    await destroySession();

    logger.info("auth/logout-all", "All sessions invalidated", { userId: session.userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("auth/logout-all", "Failed to sign out everywhere", { error: (error as Error).message });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
