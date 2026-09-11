import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { AUTH_SECRET_BYTES } from "./secrets";
import dbConnect from "./mongodb";
import User from "@/models/User";

const COOKIE_NAME = "env-manager-session";

export interface SessionPayload {
  userId: string;
  username: string;
  /**
   * Snapshot of the user's tokenVersion at the time this session was
   * issued. getSession() compares it against the current value in the
   * database, so bumping tokenVersion (e.g. on password change or a
   * "sign out everywhere" request) instantly invalidates every
   * previously issued session token without needing a server-side
   * session store.
   */
  tokenVersion: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(AUTH_SECRET_BYTES);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET_BYTES);
    const userId = payload.userId as string;
    const username = payload.username as string;
    const tokenVersion = (payload.tokenVersion as number | undefined) ?? 0;

    // Revocation check: compare the tokenVersion baked into this JWT
    // against the user's current value. A mismatch means the token was
    // issued before a password change or an explicit "sign out
    // everywhere" — reject it even though the signature is valid.
    await dbConnect();
    const user = await User.findById(userId).select("tokenVersion");
    if (!user || user.tokenVersion !== tokenVersion) {
      return null;
    }

    return { userId, username, tokenVersion };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
