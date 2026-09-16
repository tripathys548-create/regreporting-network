import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { limitOrNull, rejectCrossOrigin } from "@/lib/http";
import { recordHeartbeat } from "@/lib/repositories/presence";
import { securityConfig } from "@/lib/security/config";

export const dynamic = "force-dynamic";

/** POST /api/presence/heartbeat — signed-in members only, ~once per 60s from the client. No body; CSRF defence is the origin check (see lib/http.ts). */
export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`presence-heartbeat:${auth.session.user.id}`, securityConfig.rateLimits.presenceHeartbeat.limit, securityConfig.rateLimits.presenceHeartbeat.windowMs);
  if (limited) return limited;

  await recordHeartbeat(auth.session.user.id);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
