import { authorizeApi } from "@/lib/auth/session";
import { fromService, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { createReport } from "@/lib/services/community";
import { validateReport } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** POST /api/reports — report a discussion, reply or profile to moderators. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`report:${auth.session.user.id}`, 10, 60 * 60 * 1000);
  if (limited) return limited;

  const result = validateReport(parsed.data);
  if (!result.ok) return jsonError("Choose a reason for the report.", 422, { errors: result.errors });
  return fromService(await createReport(auth.session.user.id, result.value), 201);
}
