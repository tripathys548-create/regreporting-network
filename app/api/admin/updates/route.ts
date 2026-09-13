import { authorizeApi } from "@/lib/auth/session";
import { fromService, jsonError, parseMutation } from "@/lib/http";
import { createManualUpdate, validateManualUpdate } from "@/lib/services/moderation";

export const dynamic = "force-dynamic";

/** POST /api/admin/updates — add an update manually (for sources without a feed). Admin only. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) return auth.response;

  const result = validateManualUpdate(parsed.data);
  if (!result.ok) return jsonError(result.error, 422);
  return fromService(await createManualUpdate(auth.session.user.id, result.value), 201);
}
