/**
 * Admin alert aggregation. Related security events within
 * `securityConfig.alertAggregationWindowMs` collapse into a single
 * SecurityAlert row (and a single in-app Notification) instead of one
 * notification per occurrence — this is the alert-fatigue control.
 *
 * "Related" = same category + severity, seen within the aggregation window.
 * Never label the actor a "hacker" — use neutral, evidence-scoped language.
 */
import { prisma } from "@/lib/db";
import { securityConfig } from "./config";

const EVENT_TITLES: Record<string, string> = {
  MULTIPLE_LOGIN_FAILURES: "Multiple login failures detected",
  SIGNUP_FLOOD: "Unusual signup volume from one source",
  RATE_LIMIT_EXCEEDED: "Repeated rate-limit hits",
  REGBOT_QUOTA_EXCEEDED: "RegBot quota exceeded repeatedly",
  REGBOT_ABUSE_PATTERN: "Potential RegBot abuse pattern",
  DISCUSSION_FLOOD: "Rapid discussion creation",
  COMMENT_FLOOD: "Rapid comment creation",
  VOTE_MANIPULATION_SUSPECTED: "Potential vote manipulation",
  SEARCH_VOLUME_ANOMALY: "Unusual search volume",
  SSRF_BLOCKED: "Blocked outbound request to a disallowed address",
  UNAUTHORIZED_ADMIN_ATTEMPT: "Unauthorized attempt to access admin functionality",
  APPLICATION_ERROR: "Elevated application error rate",
};

export interface NotifyAdminsInput {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  eventType: string;
  detail: string;
}

/** Roll a new occurrence into an existing open alert within the window, or open a new one. */
export async function notifyAdmins(input: NotifyAdminsInput): Promise<void> {
  const windowStart = new Date(Date.now() - securityConfig.alertAggregationWindowMs);
  const title = EVENT_TITLES[input.eventType] ?? "Security event detected";

  const existing = await prisma.securityAlert.findFirst({
    where: { category: input.category, severity: input.severity, status: "open", lastSeenAt: { gte: windowStart } },
    orderBy: { lastSeenAt: "desc" },
  });

  if (existing) {
    await prisma.securityAlert.update({
      where: { id: existing.id },
      data: { occurrences: { increment: 1 }, lastSeenAt: new Date(), summary: input.detail || existing.summary },
    });
    return; // aggregated — no new admin notification for this occurrence
  }

  const alert = await prisma.securityAlert.create({
    data: { category: input.category, severity: input.severity, title, summary: input.detail || title },
  });

  await pushAdminNotification(alert.id, title, input.severity, input.detail);
}

async function pushAdminNotification(alertId: string, title: string, severity: string, detail: string): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: "admin", status: "active" }, select: { id: true } });
  if (admins.length === 0) return;
  const icon = severity === "critical" ? "🔴" : severity === "high" ? "🟠" : "🟡";
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "security-alert",
      title: `${icon} ${severity.toUpperCase()} security event`,
      body: `${title}${detail ? ` — ${detail}` : ""}`,
      href: `/admin/security?alert=${alertId}`,
    })),
  });
}
