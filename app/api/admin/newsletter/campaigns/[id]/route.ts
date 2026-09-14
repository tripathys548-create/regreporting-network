import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { cancelSchedule, scheduleCampaign, sendCampaignNow, sendTestEmail, updateCampaignDraft } from "@/lib/services/newsletterCampaigns";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/newsletter/campaigns/:id { action, ... } — staff only.
 * save-draft (fields) | schedule (scheduledAt) | cancel-schedule | send-test (toEmail) | send-now
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ staff: true });
  if (!auth.ok) return auth.response;

  const raw = asRecord(parsed.data);
  const actorId = auth.session.user.id;
  const action = typeof raw.action === "string" ? raw.action : "save-draft";

  switch (action) {
    case "save-draft": {
      const input = Object.fromEntries(Object.entries(raw).filter(([k, v]) => k !== "action" && typeof v === "string")) as Record<string, string>;
      return fromService(await updateCampaignDraft(actorId, params.id, input));
    }
    case "schedule": {
      const scheduledAt = typeof raw.scheduledAt === "string" ? new Date(raw.scheduledAt) : null;
      if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return jsonError("Choose a valid date and time.", 422);
      return fromService(await scheduleCampaign(actorId, params.id, scheduledAt));
    }
    case "cancel-schedule":
      return fromService(await cancelSchedule(actorId, params.id));
    case "send-test": {
      const toEmail = typeof raw.toEmail === "string" && raw.toEmail.trim() ? raw.toEmail.trim() : auth.session.user.email;
      return fromService(await sendTestEmail(actorId, params.id, toEmail));
    }
    case "send-now":
      return fromService(await sendCampaignNow(actorId, params.id));
    default:
      return jsonError("Unknown action.", 400);
  }
}
