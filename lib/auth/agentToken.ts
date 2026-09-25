import { createHash, timingSafeEqual } from "node:crypto";
import { clientIp, jsonError, limitOrNull } from "@/lib/http";
import type { NextResponse } from "next/server";

/**
 * Machine access for the Argus agent (weekly newsletter). Bearer token compared against
 * AGENT_API_TOKEN; the whole /api/agent/* surface is off (404) until that env var is set
 * to at least 32 characters, so a missing variable can never mean "open".
 */
export function authorizeAgent(request: Request): NextResponse | null {
  const expected = process.env.AGENT_API_TOKEN ?? "";
  if (expected.length < 32) return jsonError("Not found.", 404);

  const limited = limitOrNull(`agent:${clientIp(request)}`, 30, 10 * 60 * 1000);
  if (limited) return limited;

  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Hash both sides so timingSafeEqual always compares equal-length buffers.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!given || !timingSafeEqual(a, b)) return jsonError("Invalid agent token.", 401);
  return null;
}
