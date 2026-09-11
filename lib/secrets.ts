/**
 * Single source of truth for server-side secrets.
 *
 * Previously, AUTH_SECRET had silent hardcoded fallbacks scattered across
 * lib/auth.ts, middleware.ts, and lib/crypto.ts (two *different* literal
 * fallback strings, in fact). If the environment variable was ever missing
 * in a deployment, the app would keep running — but session JWTs and the
 * data-encryption key would both be signed/derived from a constant that is
 * public in this repository, silently defeating authentication and
 * encryption at once.
 *
 * This module fails fast at import time instead: if AUTH_SECRET is missing
 * or too short, every module that needs it (and therefore the app) refuses
 * to start, the same way lib/mongodb.ts already fails fast on a missing
 * MONGODB_URI.
 */

function requireEnv(name: string, minLength: number): string {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(
      `${name} environment variable must be set and at least ${minLength} characters long. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`
    );
  }
  return value;
}

// 32 chars minimum keeps this usable as an HMAC-SHA256 key and as AES-256
// key-derivation input without being trivially guessable.
export const AUTH_SECRET: string = requireEnv("AUTH_SECRET", 32);

// Edge-runtime-safe encoded form for `jose`, shared by lib/auth.ts and
// middleware.ts so both verify against the exact same key material.
export const AUTH_SECRET_BYTES: Uint8Array = new TextEncoder().encode(AUTH_SECRET);
