import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_SECRET_BYTES } from "./lib/secrets";

const PROTECTED_ROUTES = ["/user"];
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("env-manager-session")?.value;

  // NOTE: this is a signature/expiry check only (no tokenVersion /
  // revocation lookup here — the edge middleware runtime avoids a DB
  // round trip on every navigation for latency reasons). It exists
  // purely to redirect the browser to the right page. The actual
  // authorization boundary is enforced per-request in lib/auth.ts's
  // getSession(), which every API route calls and which DOES check
  // tokenVersion against the database. A revoked token that still
  // passes this middleware check will be rejected by the API itself.
  let isAuthenticated = false;
  if (sessionToken) {
    try {
      await jwtVerify(sessionToken, AUTH_SECRET_BYTES);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect authenticated users away from login/register
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/user", request.url));
    }
    return NextResponse.next();
  }

  // Protect /user routes
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/login", "/register"],
};
