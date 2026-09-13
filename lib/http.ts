import { NextResponse } from "next/server";
import type { ServiceResult } from "./services/community";
import { rateLimit } from "./rateLimit";

/** Maps a service result onto an HTTP response. */
export function fromService<T>(result: ServiceResult<T>, successStatus = 200) {
  return result.ok ? NextResponse.json(result.value, { status: successStatus }) : NextResponse.json({ error: result.error }, { status: result.status });
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

/**
 * CSRF defence for cookie-authenticated writes. Session cookies are SameSite=Lax;
 * additionally reject browser requests whose Origin does not match this host.
 */
export function rejectCrossOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null; // non-browser clients
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    // fall through
  }
  return jsonError("Cross-origin request rejected.", 403);
}

export async function readJson(request: Request): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return { ok: false, response: jsonError("Request body must be JSON.", 400) };
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** Returns a 429 response when the key has exceeded its budget, otherwise null. */
export function limitOrNull(key: string, limit: number, windowMs: number): NextResponse | null {
  const result = rateLimit(key, limit, windowMs);
  if (result.ok) return null;
  return NextResponse.json(
    { error: `Too many requests. Try again in ${result.retryAfterSec} seconds.` },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } },
  );
}

/** Standard guard for mutating endpoints: origin check, JSON body. */
export async function parseMutation(request: Request): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return { ok: false, response: blocked };
  return readJson(request);
}
