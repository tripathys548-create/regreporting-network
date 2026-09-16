import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/repositories/notifications";
import { securityConfig } from "@/lib/security/config";
import { validateNotificationPreferences } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** GET /api/notifications/preferences → the signed-in member's delivery preferences (defaults if never set). */
export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const preferences = await getNotificationPreferences(auth.session.user.id);
  return NextResponse.json({ preferences }, { headers: { "Cache-Control": "private, no-store" } });
}

/** PATCH /api/notifications/preferences { ...booleans } — partial update, unknown fields rejected. */
export async function PATCH(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`notification-prefs:${auth.session.user.id}`, securityConfig.rateLimits.notificationPreferences.limit, securityConfig.rateLimits.notificationPreferences.windowMs);
  if (limited) return limited;

  const result = validateNotificationPreferences(parsed.data);
  if (!result.ok) return jsonError("Please fix the highlighted fields.", 422, { errors: result.errors });

  const preferences = await updateNotificationPreferences(auth.session.user.id, result.value);
  return NextResponse.json({ preferences });
}
