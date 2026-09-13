import { authorizeApi } from "@/lib/auth/session";
import { fromService, rejectCrossOrigin } from "@/lib/http";
import { toggleAcceptedAnswer } from "@/lib/services/community";

export const dynamic = "force-dynamic";

/** POST /api/comments/:id/accept — the discussion author accepts (or un-accepts) an answer. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const auth = await authorizeApi({ verified: true });
  if (!auth.ok) return auth.response;
  return fromService(await toggleAcceptedAnswer(params.id, auth.session.user.id));
}
