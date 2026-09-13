import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Session tokens are high-entropy, so a plain SHA-256 is sufficient for storage. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateVerificationCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
    return "development-only-insecure-secret";
  }
  return secret;
}

/** Verification codes are low-entropy, so they are keyed with AUTH_SECRET and bound to the user. */
export function hashVerificationCode(userId: string, code: string): string {
  return createHmac("sha256", authSecret()).update(`${userId}:${code}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
