import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { broadcastAnnouncement } from "@/lib/services/moderation";
import { securityConfig } from "@/lib/security/config";

export const dynamic = "force-dynamic";

/** POST /api/admin/announcements { message } — admin only. Broadcasts an in-app notification to every active member (opted-in). */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`admin-announcement:${auth.session.user.id}`, securityConfig.rateLimits.adminAnnouncement.limit, securityConfig.rateLimits.adminAnnouncement.windowMs);
  if (limited) return limited;

  const { message } = asRecord(parsed.data);
  if (typeof message !== "string") return jsonError("message is required.", 400);

  return fromService(await broadcastAnnouncement(auth.session.user.id, message), 201);
}
