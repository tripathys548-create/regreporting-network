import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, parseMutation } from "@/lib/http";
import { updateSuggestion } from "@/lib/services/suggestions";

export const dynamic = "force-dynamic";

/** PATCH /api/admin/suggestions/:id { status?, ownerId?, adminNotes?, targetRelease? } — staff only. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ staff: true });
  if (!auth.ok) return auth.response;

  const { status, ownerId, adminNotes, targetRelease } = asRecord(parsed.data);
  return fromService(
    await updateSuggestion(auth.session.user.id, params.id, {
      status: typeof status === "string" ? status : undefined,
      ownerId: ownerId === null ? null : typeof ownerId === "string" ? ownerId : undefined,
      adminNotes: typeof adminNotes === "string" ? adminNotes : undefined,
      targetRelease: typeof targetRelease === "string" ? targetRelease : undefined,
    }),
  );
}
