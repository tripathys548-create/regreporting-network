import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { resendWelcomeEmail, setPractitionerVerified, setUserRole, setUserSuspended } from "@/lib/services/moderation";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/:id { action, reason?, role? }
 * suspend | reinstate | verify | unverify — moderators and admins
 * role — admins only
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const { action, reason, role } = asRecord(parsed.data);

  const auth = await authorizeApi(action === "role" ? { admin: true } : { staff: true });
  if (!auth.ok) return auth.response;
  const actorId = auth.session.user.id;
  const text = typeof reason === "string" ? reason.slice(0, 500) : "";

  switch (action) {
    case "suspend":
      return fromService(await setUserSuspended(actorId, params.id, true, text));
    case "reinstate":
      return fromService(await setUserSuspended(actorId, params.id, false));
    case "verify":
      return fromService(await setPractitionerVerified(actorId, params.id, true));
    case "unverify":
      return fromService(await setPractitionerVerified(actorId, params.id, false));
    case "role":
      return fromService(await setUserRole(actorId, params.id, typeof role === "string" ? role : ""));
    case "resend-welcome":
      return fromService(await resendWelcomeEmail(actorId, params.id));
    default:
      return jsonError("Unknown action.", 400);
  }
}
