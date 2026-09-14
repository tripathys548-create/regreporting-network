import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, parseMutation } from "@/lib/http";
import { createCampaign } from "@/lib/services/newsletterCampaigns";

export const dynamic = "force-dynamic";

/** POST /api/admin/newsletter/campaigns — create a draft newsletter. Staff only. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ staff: true });
  if (!auth.ok) return auth.response;

  const raw = asRecord(parsed.data);
  const input = Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === "string")) as Record<string, string>;
  return fromService(await createCampaign(auth.session.user.id, input), 201);
}
