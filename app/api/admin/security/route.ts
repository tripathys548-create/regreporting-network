import { authorizeApi } from "@/lib/auth/session";
import { asRecord, fromService, jsonError, parseMutation } from "@/lib/http";
import { escalateAlert, liftRestrictionAsAdmin, markEventReviewed, resolveAlert, restrictTarget } from "@/lib/services/security";
import { newRequestId } from "@/lib/security/requestId";
import { recordSecurityEvent } from "@/lib/security/events";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/security { action, ...fields } — admin-only security actions
 * (section 13 of the security spec). Every action is audited (section 14).
 *
 * action: "review-event" | "resolve-alert" | "escalate-alert" | "restrict" | "lift-restriction"
 */
export async function POST(request: Request) {
  const requestId = newRequestId();
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) {
    // A non-admin hitting this endpoint at all is itself a signal worth recording.
    await recordSecurityEvent({ requestId, eventType: "UNAUTHORIZED_ADMIN_ATTEMPT", route: "/api/admin/security" });
    return auth.response;
  }

  const actorId = auth.session.user.id;
  const body = asRecord(parsed.data);
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : "";

  switch (body.action) {
    case "review-event": {
      if (typeof body.eventId !== "string") return jsonError("eventId is required.", 400);
      return fromService(await markEventReviewed(actorId, body.eventId, note, requestId));
    }
    case "resolve-alert": {
      if (typeof body.alertId !== "string") return jsonError("alertId is required.", 400);
      return fromService(await resolveAlert(actorId, body.alertId, note, requestId));
    }
    case "escalate-alert": {
      if (typeof body.alertId !== "string") return jsonError("alertId is required.", 400);
      return fromService(await escalateAlert(actorId, body.alertId, note, requestId));
    }
    case "restrict": {
      const { targetType, targetId, level, reason, durationMs } = body;
      if ((targetType !== "user" && targetType !== "source") || typeof targetId !== "string" || typeof level !== "string" || typeof reason !== "string") {
        return jsonError("targetType, targetId, level and reason are required.", 400);
      }
      return fromService(await restrictTarget(actorId, targetType, targetId, level, reason, typeof durationMs === "number" ? durationMs : undefined, requestId));
    }
    case "lift-restriction": {
      if (typeof body.restrictionId !== "string") return jsonError("restrictionId is required.", 400);
      return fromService(await liftRestrictionAsAdmin(actorId, body.restrictionId, requestId));
    }
    default:
      return jsonError("Unknown action.", 400);
  }
}
