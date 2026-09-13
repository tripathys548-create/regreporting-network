import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { toggleSave } from "@/lib/services/community";

export const dynamic = "force-dynamic";

/** POST /api/saves { discussionId } — toggles a saved discussion (private to the member). */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { discussionId } = asRecord(parsed.data);
  if (typeof discussionId !== "string" || !discussionId) return jsonError("Invalid discussion.", 400);
  return fromService(await toggleSave(discussionId, auth.session.user.id));
}
