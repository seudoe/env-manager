import crypto from "crypto";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateSecureRandom(length: number): string {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[bytes[i] % CHARS.length];
  }
  return result;
}

export function generateProjectId(): string {
  return `envp_${generateSecureRandom(10)}`;
}

export function generateToken(): string {
  return `envt_${generateSecureRandom(20)}`;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyToken(plainToken: string, hashedToken: string): boolean {
  const hash = hashToken(plainToken);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
}
