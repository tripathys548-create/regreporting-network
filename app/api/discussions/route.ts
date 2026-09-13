import { authorizeApi } from "@/lib/auth/session";
import { fromService, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { createDiscussion } from "@/lib/services/community";
import { validateNewDiscussion } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/discussions — verified members only. Published immediately;
 * abuse is handled through rate limits and member reports. Phase 3 can add
 * pre-moderation for new accounts via the existing "pending-review" status.
 */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ verified: true });
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`discussion:${auth.session.user.id}`, 5, 60 * 60 * 1000);
  if (limited) return limited;

  const result = validateNewDiscussion(parsed.data);
  if (!result.ok) return jsonError("Please fix the highlighted fields.", 422, { errors: result.errors });

  return fromService(await createDiscussion(auth.session.user.id, result.value), 201);
}
