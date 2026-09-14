import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CONFIRMATION_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

/** High-entropy, single-use tokens — a plain SHA-256 of the raw value is sufficient for storage. */
export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function confirmationExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + CONFIRMATION_TTL_MS);
}

function authSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production");
    return "development-only-insecure-secret";
  }
  return secret;
}

/**
 * The one-click unsubscribe link needs to keep working across every future campaign send, so it
 * can't be a single-use stored secret. Instead it's an HMAC of the subscription's own id (never
 * the linked user's id) under AUTH_SECRET — recomputed on demand, nothing extra to store or rotate.
 */
export function unsubscribeTokenFor(subscriptionId: string): string {
  return createHmac("sha256", authSecret()).update(`newsletter-unsubscribe:${subscriptionId}`).digest("hex");
}

export function verifyUnsubscribeToken(subscriptionId: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeTokenFor(subscriptionId), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  return expected.length === given.length && timingSafeEqual(expected, given);
}
