/**
 * Thin glue between the existing app-level rate limiter (lib/rateLimit.ts),
 * the security event pipeline, and progressive restrictions. Route handlers
 * should prefer these helpers over calling rateLimit()/recordSecurityEvent()
 * separately so every rate-limit trip is consistently logged.
 *
 * Rate limiting here is defense-in-depth for a single Node process. It is
 * NOT a substitute for edge rate limiting — see docs/CLOUDFLARE_SETUP.md.
 * Composite keys combine IP + authenticated user + endpoint so one shared
 * corporate IP does not throttle every employee behind it once any of them
 * is signed in.
 */
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { newRequestId } from "./requestId";
import { recordSecurityEvent } from "./events";
import { isRestricted } from "./restrictions";

export interface GuardContext {
  requestId: string;
  ip: string;
  userId: string | null;
  route: string;
}

export function buildGuardContext(request: Request, route: string, userId: string | null, clientIp: (r: Request) => string): GuardContext {
  return { requestId: newRequestId(), ip: clientIp(request), userId, route };
}

/** Rate-limit key that prefers the authenticated user (stable identity) over shared IPs, falling back to IP for anonymous traffic. */
export function compositeKey(ctx: GuardContext, endpoint: string): string {
  return `${endpoint}:${ctx.userId ? `user:${ctx.userId}` : `ip:${ctx.ip}`}`;
}

export async function limitOrRecord(
  ctx: GuardContext,
  endpoint: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const result = rateLimit(compositeKey(ctx, endpoint), limit, windowMs);
  if (result.ok) return null;

  await recordSecurityEvent({
    requestId: ctx.requestId,
    eventType: "RATE_LIMIT_EXCEEDED",
    route: ctx.route,
    ip: ctx.ip,
    userId: ctx.userId,
    detail: `endpoint=${endpoint}`,
  });

  return NextResponse.json(
    { error: `Too many requests. Try again in ${result.retryAfterSec} seconds.`, requestId: ctx.requestId },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec), "X-Request-Id": ctx.requestId } },
  );
}

/** Blocks a request outright if its user or source is currently at the "restricted" progressive-control level. */
export async function rejectIfRestricted(ctx: GuardContext): Promise<NextResponse | null> {
  const userRestricted = ctx.userId ? await isRestricted("user", ctx.userId) : false;
  const sourceRestricted = await isRestricted("source", ctx.ip);
  if (!userRestricted && !sourceRestricted) return null;

  await recordSecurityEvent({
    requestId: ctx.requestId,
    eventType: "RATE_LIMIT_EXCEEDED",
    route: ctx.route,
    ip: ctx.ip,
    userId: ctx.userId,
    detail: "blocked: active restriction",
    severityOverride: "medium",
  });

  return NextResponse.json(
    { error: "This account or source is temporarily restricted. Please try again later.", requestId: ctx.requestId },
    { status: 429, headers: { "X-Request-Id": ctx.requestId } },
  );
}

/** Generic safe error response — never leak stack traces or internal details to the client. */
export function safeErrorResponse(requestId: string, status = 500): NextResponse {
  return NextResponse.json({ error: "Something went wrong. Please try again.", requestId }, { status, headers: { "X-Request-Id": requestId } });
}
