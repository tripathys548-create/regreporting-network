import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { resolveReport } from "@/lib/services/moderation";

export const dynamic = "force-dynamic";

/** POST /api/admin/reports/:id { resolution: "actioned" | "dismissed", removeContent?, note? } */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ staff: true });
  if (!auth.ok) return auth.response;

  const { resolution, removeContent, note } = asRecord(parsed.data);
  if (resolution !== "actioned" && resolution !== "dismissed") return jsonError("Unknown resolution.", 400);
  return fromService(
    await resolveReport(auth.session.user.id, params.id, resolution, { removeContent: removeContent === true, note: typeof note === "string" ? note.slice(0, 500) : "" }),
  );
}
