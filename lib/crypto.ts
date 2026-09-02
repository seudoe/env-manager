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
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedToken));
}

const ENCRYPTION_PREFIX = "enc:v1:";

export function encryptData(plaintext: string, token: string): string {
  const secret = process.env.AUTH_SECRET || "fallback_secret_for_dev";
  const key = crypto.createHash("sha256").update(token + secret).digest();
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  const authTag = cipher.getAuthTag().toString("base64");
  
  return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${authTag}:${encrypted}`;
}

export function decryptData(ciphertext: string, token: string): string {
  if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
    return ciphertext; // Legacy plaintext data
  }
  
  const parts = ciphertext.substring(ENCRYPTION_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }
  
  const [ivBase64, authTagBase64, encryptedData] = parts;
  
  const secret = process.env.AUTH_SECRET || "fallback_secret_for_dev";
  const key = crypto.createHash("sha256").update(token + secret).digest();
  
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
