import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { editUpdate, reviewUpdate, validateUpdateEdit, type UpdateReviewAction } from "@/lib/services/moderation";

export const dynamic = "force-dynamic";

const ACTIONS: UpdateReviewAction[] = ["approve", "reject", "archive", "requeue"];

/** PATCH /api/admin/updates/:id — edit title, summary, topics, severity, alert flag. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) return auth.response;

  const result = validateUpdateEdit(parsed.data);
  if (!result.ok) return jsonError(result.error, 422);
  return fromService(await editUpdate(auth.session.user.id, params.id, result.value));
}

/** POST /api/admin/updates/:id { action: approve | reject | archive | requeue, note? } */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) return auth.response;

  const { action, note } = asRecord(parsed.data);
  const reviewAction = ACTIONS.find((a) => a === action);
  if (!reviewAction) return jsonError("Unknown action.", 400);
  return fromService(await reviewUpdate(auth.session.user.id, params.id, reviewAction, typeof note === "string" ? note.slice(0, 500) : ""));
}
