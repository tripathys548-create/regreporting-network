import { authorizeApi } from "@/lib/auth/session";
import { fromService, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { createComment } from "@/lib/services/community";
import { validateComment } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** POST /api/discussions/:id/comments — reply to a discussion or to a reply. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ verified: true });
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`comment:${auth.session.user.id}`, 20, 10 * 60 * 1000);
  if (limited) return limited;

  const result = validateComment(parsed.data);
  if (!result.ok) return jsonError(result.errors.body ?? "Invalid reply.", 422, { errors: result.errors });

  return fromService(await createComment(params.id, auth.session.user.id, result.value), 201);
}
