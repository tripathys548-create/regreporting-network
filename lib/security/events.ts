/**
 * Security event pipeline:
 *
 *   Application → Security Event → Risk Classification → Security Log → Admin Notification → Admin Dashboard
 *
 * Call `recordSecurityEvent` from anywhere abuse or suspicious activity is
 * observed. It persists the event, logs it structurally, and (for medium+
 * severity) feeds the alert aggregator so admins get one grouped notification
 * instead of one per occurrence — see lib/security/alerts.ts.
 */
import { prisma } from "@/lib/db";
import { logSecurityEvent } from "./logger";
import { notifyAdmins } from "./alerts";

export type SecurityCategory =
  | "authentication"
  | "api-abuse"
  | "regbot-abuse"
  | "community-abuse"
  | "admin-security"
  | "infrastructure"
  | "data-security"
  | "application-error";

export type SecuritySeverity = "low" | "medium" | "high" | "critical";

/** Known event types and their baseline risk score / severity. Extend as new signals are added. */
const EVENT_CATALOG: Record<string, { category: SecurityCategory; severity: SecuritySeverity; riskScore: number }> = {
  MULTIPLE_LOGIN_FAILURES: { category: "authentication", severity: "high", riskScore: 7 },
  LOGIN_FAILURE: { category: "authentication", severity: "low", riskScore: 1 },
  SIGNUP_FLOOD: { category: "authentication", severity: "medium", riskScore: 5 },
  RATE_LIMIT_EXCEEDED: { category: "api-abuse", severity: "low", riskScore: 2 },
  REGBOT_QUOTA_EXCEEDED: { category: "regbot-abuse", severity: "medium", riskScore: 4 },
  REGBOT_ABUSE_PATTERN: { category: "regbot-abuse", severity: "high", riskScore: 6 },
  DISCUSSION_FLOOD: { category: "community-abuse", severity: "medium", riskScore: 4 },
  COMMENT_FLOOD: { category: "community-abuse", severity: "medium", riskScore: 4 },
  VOTE_MANIPULATION_SUSPECTED: { category: "community-abuse", severity: "medium", riskScore: 5 },
  SEARCH_VOLUME_ANOMALY: { category: "api-abuse", severity: "low", riskScore: 3 },
  SSRF_BLOCKED: { category: "infrastructure", severity: "high", riskScore: 8 },
  CROSS_ORIGIN_REJECTED: { category: "api-abuse", severity: "low", riskScore: 2 },
  ADMIN_ACTION: { category: "admin-security", severity: "low", riskScore: 1 },
  UNAUTHORIZED_ADMIN_ATTEMPT: { category: "admin-security", severity: "critical", riskScore: 9 },
  APPLICATION_ERROR: { category: "application-error", severity: "medium", riskScore: 3 },
};

export interface RecordEventInput {
  requestId: string;
  eventType: string;
  route?: string;
  ip?: string;
  userId?: string | null;
  detail?: string;
  /** Override the catalog severity/riskScore for a signal that escalated (e.g. repeated occurrences). */
  severityOverride?: SecuritySeverity;
  riskScoreOverride?: number;
}

export async function recordSecurityEvent(input: RecordEventInput): Promise<void> {
  const known = EVENT_CATALOG[input.eventType] ?? { category: "application-error" as const, severity: "low" as const, riskScore: 1 };
  const severity = input.severityOverride ?? known.severity;
  const riskScore = input.riskScoreOverride ?? known.riskScore;

  logSecurityEvent({
    requestId: input.requestId,
    eventType: input.eventType,
    severity,
    route: input.route,
    userId: input.userId,
    detail: input.detail,
  });

  await prisma.securityEvent.create({
    data: {
      requestId: input.requestId,
      eventType: input.eventType,
      category: known.category,
      severity,
      riskScore,
      route: input.route ?? "",
      ip: input.ip ?? "",
      userId: input.userId ?? null,
      detail: (input.detail ?? "").slice(0, 500),
    },
  });

  if (severity === "medium" || severity === "high" || severity === "critical") {
    await notifyAdmins({ category: known.category, severity, eventType: input.eventType, detail: input.detail ?? "" });
  }
}
