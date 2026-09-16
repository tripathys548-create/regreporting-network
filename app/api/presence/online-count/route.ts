import { NextResponse } from "next/server";
import { clientIp, limitOrNull } from "@/lib/http";
import { getOnlineCount } from "@/lib/repositories/presence";
import { securityConfig } from "@/lib/security/config";

export const dynamic = "force-dynamic";

/**
 * GET /api/presence/online-count — public, unauthenticated. Returns only the
 * aggregate count (in-memory cached ~15s — see lib/repositories/presence.ts).
 * Never returns user ids, emails, sessions, or individual activity.
 */
export async function GET(request: Request) {
  const limited = limitOrNull(`online-count:${clientIp(request)}`, securityConfig.rateLimits.onlineCount.limit, securityConfig.rateLimits.onlineCount.windowMs);
  if (limited) return limited;

  const onlineMembers = await getOnlineCount();
  return NextResponse.json({ onlineMembers }, { headers: { "Cache-Control": "public, max-age=15" } });
}
