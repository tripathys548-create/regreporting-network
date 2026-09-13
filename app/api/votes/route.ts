import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { toggleUpvote } from "@/lib/services/community";

export const dynamic = "force-dynamic";

/** POST /api/votes { target: "discussion" | "comment", id } — toggles an upvote. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ verified: true });
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`vote:${auth.session.user.id}`, 60, 60 * 1000);
  if (limited) return limited;

  const { target, id } = asRecord(parsed.data);
  if ((target !== "discussion" && target !== "comment") || typeof id !== "string" || !id) return jsonError("Invalid vote.", 400);
  return fromService(await toggleUpvote(target, id, auth.session.user.id));
}
