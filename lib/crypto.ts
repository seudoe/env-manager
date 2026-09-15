import crypto from "crypto";
import { AUTH_SECRET } from "./secrets";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
// 256 is not an exact multiple of CHARS.length (62), so a plain `% 62`
// biases the first 256 % 62 = 8 characters of the alphabet slightly high
// (5/256 vs 4/256 per byte). Reject bytes past the last full multiple of
// 62 below 256 and redraw, so every character is equally likely.
const CHARS_LIMIT = CHARS.length * Math.floor(256 / CHARS.length); // 248

function generateSecureRandom(length: number): string {
  let result = "";
  while (result.length < length) {
    const bytes = crypto.randomBytes(length - result.length);
    for (let i = 0; i < bytes.length && result.length < length; i++) {
      if (bytes[i] < CHARS_LIMIT) {
        result += CHARS[bytes[i] % CHARS.length];
      }
    }
  }
  return result;
}

export function generateProjectId(): string {
  return `envp_${generateSecureRandom(10)}`;
}

export function generateTempProjectId(): string {
  return `envpt_${generateSecureRandom(10)}`;
}

export function generateToken(): string {
  return `envt_${generateSecureRandom(20)}`;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyToken(plainToken: string, hashedToken: string): boolean {
  const hash = hashToken(plainToken);
  const hashBuf = Buffer.from(hash);
  const hashedTokenBuf = Buffer.from(hashedToken);
  // timingSafeEqual throws on mismatched lengths instead of returning
  // false. Both sides are normally a fixed-width 64-char hex digest, but
  // guard explicitly so a malformed/legacy tokenHash value can't turn an
  // expected 401 into an unhandled 500.
  if (hashBuf.length !== hashedTokenBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashBuf, hashedTokenBuf);
}

const ENCRYPTION_PREFIX = "enc:v1:";

/**
 * Derives the AES-256-GCM key for a project from its projectId and the
 * server-only AUTH_SECRET — NOT from the project's access token.
 *
 * Previously the key was sha256(token + secret), and the plaintext token
 * was also stored in the same database document as the ciphertext (see
 * models/Project.ts). That meant anyone with read access to the database
 * — a backup, a misconfigured cluster, a leaked connection string — could
 * decrypt every project's data using only what was sitting right next to
 * it, making the encryption layer provide no protection against that
 * threat. Deriving the key from a secret that lives only in the server's
 * environment (never in the database) means a database-only compromise
 * no longer yields plaintext, and it decouples the encryption key from
 * the access token entirely, so rotating a project's token (see
 * /api/projects/[projectId]/rotate-token) no longer requires re-encrypting
 * its data.
 */
function deriveProjectKey(projectId: string): Buffer {
  return crypto.createHash("sha256").update(`${projectId}:${AUTH_SECRET}`).digest();
}

export function encryptData(plaintext: string, projectId: string): string {
  const key = deriveProjectKey(projectId);

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${authTag}:${encrypted}`;
}

export function decryptData(ciphertext: string, projectId: string): string {
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    return ciphertext; // Legacy plaintext data
  }

  const parts = ciphertext.substring(ENCRYPTION_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivBase64, authTagBase64, encryptedData] = parts;

  const key = deriveProjectKey(projectId);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivBase64, "base64")
  );

  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  let decrypted = decipher.update(encryptedData, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
import zlib from "zlib";

export function encryptBlob(obj: any, projectId: string): string {
  const jsonStr = JSON.stringify(obj);
  const compressed = zlib.deflateSync(jsonStr).toString("base64");
  return encryptData(compressed, projectId);
}

export function decryptBlob(ciphertext: string, projectId: string): any {
  if (!ciphertext) return null;
  const decrypted = decryptData(ciphertext, projectId);
  try {
    const inflated = zlib.inflateSync(Buffer.from(decrypted, "base64")).toString("utf8");
    return JSON.parse(inflated);
  } catch (e) {
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }
}
