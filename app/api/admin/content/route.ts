import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { setContentRemoved } from "@/lib/services/moderation";

export const dynamic = "force-dynamic";

/** POST /api/admin/content { targetType, targetId, removed, reason } — remove or restore. Moderators and admins. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ staff: true });
  if (!auth.ok) return auth.response;

  const { targetType, targetId, removed, reason } = asRecord(parsed.data);
  if ((targetType !== "discussion" && targetType !== "comment") || typeof targetId !== "string" || typeof removed !== "boolean") return jsonError("Invalid request.", 400);
  return fromService(await setContentRemoved(auth.session.user.id, targetType, targetId, removed, typeof reason === "string" ? reason.slice(0, 500) : ""));
}
