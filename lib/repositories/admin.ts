import { ARTICLES } from "@/data/knowledge";
import { CHALLENGES, QUESTIONS } from "@/data/challenges";
import { SOURCES } from "@/data/sources";
import { prisma } from "@/lib/db";
import { emailDeliveryConfigured } from "@/lib/email/mailer";
import type { ContentReport, RegulatoryUpdate, UserRole } from "@/types";
import { initialsFor, toContentReport, toRegulatoryUpdate } from "./mappers";

export type AdminSection = "updates" | "sources" | "reports" | "moderation" | "users" | "audit" | "knowledge" | "challenges" | "security" | "suggestions";

export interface AdminSectionSummary {
  id: AdminSection;
  label: string;
  description: string;
  total: number;
  needsAttention: number;
  attentionLabel: string;
  /** Moderators can open these; the rest are admin-only. */
  staff: boolean;
}

const DAY_MS = 86_400_000;

export async function getAdminOverview(): Promise<AdminSectionSummary[]> {
  const [updates, pendingUpdates, feeds, failingFeeds, reports, openReports, removed, users, unverified, audit, securityEvents, openAlerts, suggestions, openSuggestions] = await Promise.all([
    prisma.regulatoryUpdate.count(),
    prisma.regulatoryUpdate.count({ where: { status: "pending-review" } }),
    prisma.sourceFeed.count(),
    prisma.sourceFeed.count({ where: { lastStatus: "error" } }),
    prisma.contentReport.count(),
    prisma.contentReport.count({ where: { status: "open" } }),
    prisma.discussion.count({ where: { status: "removed" } }).then(async (d) => d + (await prisma.comment.count({ where: { status: "removed" } }))),
    prisma.user.count(),
    prisma.user.count({ where: { OR: [{ status: "pending" }, { status: "suspended" }] } }),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) } } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: new Date(Date.now() - DAY_MS) } } }),
    prisma.securityAlert.count({ where: { status: "open" } }),
    prisma.suggestion.count(),
    prisma.suggestion.count({ where: { status: "open" } }),
  ]);

  return [
    { id: "updates", label: "Regulatory Updates", description: "Review ingested updates before they are published to the Radar.", total: updates, needsAttention: pendingUpdates, attentionLabel: "awaiting review", staff: false },
    { id: "sources", label: "Sources & Ingestion", description: "Official feeds, ingestion runs and manual entries.", total: feeds, needsAttention: failingFeeds, attentionLabel: "feeds failing", staff: false },
    { id: "reports", label: "Reported Content", description: "Member reports of misleading claims, spam or confidential data.", total: reports, needsAttention: openReports, attentionLabel: "open reports", staff: true },
    { id: "moderation", label: "Removed Content", description: "Discussions and replies removed by moderators.", total: removed, needsAttention: 0, attentionLabel: "", staff: true },
    { id: "users", label: "Members", description: "Suspensions, practitioner verification and roles.", total: users, needsAttention: unverified, attentionLabel: "pending or suspended", staff: true },
    { id: "security", label: "Security Center", description: "Threat level, security events, alerts and protection controls.", total: securityEvents, needsAttention: openAlerts, attentionLabel: "open alerts", staff: false },
    { id: "audit", label: "Audit Log", description: "Every staff action.", total: audit, needsAttention: 0, attentionLabel: "in the last 7 days", staff: true },
    { id: "suggestions", label: "Suggestions", description: "Improvement and bug suggestions from members.", total: suggestions, needsAttention: openSuggestions, attentionLabel: "open", staff: true },
    { id: "knowledge", label: "Knowledge Base", description: "Reference articles. In-app editing is not available yet.", total: ARTICLES.length, needsAttention: ARTICLES.filter((a) => a.isDemo).length, attentionLabel: "not yet verified against sources", staff: false },
    { id: "challenges", label: "Challenges", description: "Practice questions. In-app editing is not available yet.", total: CHALLENGES.length, needsAttention: QUESTIONS.filter((q) => q.isDemo).length, attentionLabel: "not yet verified against sources", staff: false },
  ];
}

/* ───────── Updates ───────── */

export type UpdateQueue = "pending-review" | "published" | "archived" | "rejected";

export interface AdminUpdateRow extends RegulatoryUpdate {
  relevanceScore: number;
  reviewNote: string | null;
  ingestedFrom: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  createdAt: string;
}

export async function listUpdatesForReview(queue: UpdateQueue, limit = 60): Promise<{ rows: AdminUpdateRow[]; counts: Record<UpdateQueue, number> }> {
  const [rows, grouped] = await Promise.all([
    prisma.regulatoryUpdate.findMany({
      where: { status: queue },
      orderBy: queue === "pending-review" ? [{ relevanceScore: "desc" }, { publishedAt: "desc" }] : [{ publishedAt: "desc" }],
      take: limit,
    }),
    prisma.regulatoryUpdate.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const reviewerIds = Array.from(new Set(rows.map((r) => r.reviewedById).filter((id): id is string => Boolean(id))));
  const reviewers = new Map((await prisma.profile.findMany({ where: { userId: { in: reviewerIds } } })).map((p) => [p.userId, p.displayName]));
  const counts: Record<UpdateQueue, number> = { "pending-review": 0, published: 0, archived: 0, rejected: 0 };
  for (const g of grouped) if (g.status in counts) counts[g.status as UpdateQueue] = g._count._all;

  return {
    counts,
    rows: rows.map((r) => ({
      ...toRegulatoryUpdate(r),
      relevanceScore: r.relevanceScore,
      reviewNote: r.reviewNote,
      ingestedFrom: r.ingestedFrom,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      reviewerName: r.reviewedById ? reviewers.get(r.reviewedById) ?? "Former staff" : null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/* ───────── Feeds ───────── */

export interface FeedStatusRow {
  id: string;
  sourceShortName: string;
  label: string;
  url: string;
  enabled: boolean;
  lastFetchedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastItemCount: number;
}

export interface IngestionRunRow {
  id: string;
  feedId: string;
  status: string;
  fetched: number;
  pending: number;
  archived: number;
  duplicates: number;
  skippedOld: number;
  rejected: number;
  error: string | null;
  startedAt: string;
}

export async function listFeedsAndRuns(): Promise<{ feeds: FeedStatusRow[]; runs: IngestionRunRow[]; emailConfigured: boolean; emailFailures7d: number }> {
  const [feeds, runs, emailFailures7d] = await Promise.all([
    prisma.sourceFeed.findMany({ orderBy: { id: "asc" } }),
    prisma.ingestionRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
    prisma.outboundEmail.count({ where: { status: "failed", createdAt: { gte: new Date(Date.now() - 7 * DAY_MS) } } }),
  ]);
  return {
    emailConfigured: emailDeliveryConfigured(),
    emailFailures7d,
    feeds: feeds.map((f) => ({
      id: f.id,
      sourceShortName: SOURCES.find((s) => s.id === f.sourceId)?.shortName ?? f.sourceId,
      label: f.label,
      url: f.url,
      enabled: f.enabled,
      lastFetchedAt: f.lastFetchedAt?.toISOString() ?? null,
      lastStatus: f.lastStatus,
      lastError: f.lastError,
      lastItemCount: f.lastItemCount,
    })),
    runs: runs.map((r) => ({ ...r, startedAt: r.startedAt.toISOString(), finishedAt: undefined })),
  };
}

/* ───────── Reports & removed content ───────── */

export interface ReportTarget {
  exists: boolean;
  status: string | null;
  title: string;
  excerpt: string;
  href: string | null;
  authorName: string | null;
}

async function describeTarget(targetType: string, targetId: string): Promise<ReportTarget> {
  if (targetType === "discussion") {
    const d = await prisma.discussion.findUnique({ where: { id: targetId }, include: { author: { include: { profile: true } } } });
    if (!d) return { exists: false, status: null, title: "Deleted discussion", excerpt: "", href: null, authorName: null };
    return { exists: true, status: d.status, title: d.title, excerpt: d.body.slice(0, 220), href: `/community/${d.slug}`, authorName: d.author.profile?.displayName ?? null };
  }
  if (targetType === "comment") {
    const c = await prisma.comment.findUnique({ where: { id: targetId }, include: { discussion: true, author: { include: { profile: true } } } });
    if (!c) return { exists: false, status: null, title: "Deleted reply", excerpt: "", href: null, authorName: null };
    return { exists: true, status: c.status, title: `Reply in "${c.discussion.title}"`, excerpt: c.body.slice(0, 220), href: `/community/${c.discussion.slug}#${c.id}`, authorName: c.author.profile?.displayName ?? null };
  }
  const p = await prisma.profile.findUnique({ where: { userId: targetId } });
  return p ? { exists: true, status: null, title: `Profile: ${p.displayName}`, excerpt: p.bio.slice(0, 220), href: `/members/${p.handle}`, authorName: p.displayName } : { exists: false, status: null, title: "Deleted profile", excerpt: "", href: null, authorName: null };
}

export async function listReportsForModeration(status: "open" | "resolved"): Promise<(ContentReport & { reporterName: string; resolution: string | null; target: ReportTarget })[]> {
  const rows = await prisma.contentReport.findMany({
    where: status === "open" ? { status: "open" } : { status: { in: ["actioned", "dismissed"] } },
    include: { reporter: { include: { profile: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return Promise.all(
    rows.map(async (r) => ({ ...toContentReport(r), reporterName: r.reporter.profile?.displayName ?? "Member", resolution: r.resolution, target: await describeTarget(r.targetType, r.targetId) })),
  );
}

export interface RemovedContentRow {
  targetType: "discussion" | "comment";
  id: string;
  title: string;
  excerpt: string;
  reason: string | null;
  removedAt: string | null;
  href: string;
}

export async function listRemovedContent(): Promise<RemovedContentRow[]> {
  const [discussions, comments] = await Promise.all([
    prisma.discussion.findMany({ where: { status: "removed" }, orderBy: { removedAt: "desc" }, take: 30 }),
    prisma.comment.findMany({ where: { status: "removed" }, include: { discussion: true }, orderBy: { removedAt: "desc" }, take: 30 }),
  ]);
  return [
    ...discussions.map((d) => ({ targetType: "discussion" as const, id: d.id, title: d.title, excerpt: d.body.slice(0, 160), reason: d.removedReason, removedAt: d.removedAt?.toISOString() ?? null, href: `/community/${d.slug}` })),
    ...comments.map((c) => ({ targetType: "comment" as const, id: c.id, title: `Reply in "${c.discussion.title}"`, excerpt: c.body.slice(0, 160), reason: c.removedReason, removedAt: c.removedAt?.toISOString() ?? null, href: `/community/${c.discussion.slug}` })),
  ].sort((a, b) => (b.removedAt ?? "").localeCompare(a.removedAt ?? ""));
}

/* ───────── Members & audit ───────── */

export interface AdminUserRow {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  emailVerified: boolean;
  suspendedReason: string | null;
  handle: string | null;
  displayName: string;
  initials: string;
  jobTitle: string | null;
  organisationName: string | null;
  yearsExperience: number | null;
  verifiedPractitioner: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const rows = await prisma.user.findMany({ include: { profile: true }, orderBy: { createdAt: "desc" }, take: 200 });
  return rows.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role as UserRole,
    status: u.status,
    emailVerified: Boolean(u.emailVerifiedAt),
    suspendedReason: u.suspendedReason,
    handle: u.profile?.handle ?? null,
    displayName: u.profile?.displayName ?? u.email,
    initials: initialsFor(u.profile?.displayName ?? u.email),
    jobTitle: u.profile?.jobTitle ?? null,
    organisationName: u.profile?.organisationName ?? null,
    yearsExperience: u.profile?.yearsExperience ?? null,
    verifiedPractitioner: u.profile?.verifiedPractitioner ?? false,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));
}

export async function listAuditLog(limit = 100): Promise<{ id: string; actorName: string; action: string; targetType: string; targetId: string; detail: string; createdAt: string }[]> {
  const rows = await prisma.auditLog.findMany({ include: { actor: { include: { profile: true } } }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({
    id: r.id,
    actorName: r.actor?.profile?.displayName ?? (r.actorId ? "Former staff" : "System"),
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    detail: r.detail,
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ───────── Security Center ───────── */

export interface SecurityOverview {
  threatLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  eventsToday: number;
  authFailuresToday: number;
  rateLimitEventsToday: number;
  regbotAbuseToday: number;
  adminEventsToday: number;
  openAlertsCount: number;
  criticalOpenCount: number;
}

export interface SecurityAlertRow {
  id: string;
  category: string;
  severity: string;
  title: string;
  summary: string;
  occurrences: number;
  status: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface SecurityEventRow {
  id: string;
  requestId: string;
  eventType: string;
  category: string;
  severity: string;
  route: string;
  ip: string;
  userId: string | null;
  detail: string;
  status: string;
  createdAt: string;
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  const since = new Date(Date.now() - DAY_MS);
  const [eventsToday, authFailuresToday, rateLimitEventsToday, regbotAbuseToday, adminEventsToday, openAlerts] = await Promise.all([
    prisma.securityEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: since }, category: "authentication" } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: since }, eventType: "RATE_LIMIT_EXCEEDED" } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: since }, category: "regbot-abuse" } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: since }, category: "admin-security" } }),
    prisma.securityAlert.findMany({ where: { status: { in: ["open", "escalated"] } }, select: { severity: true } }),
  ]);

  const criticalOpenCount = openAlerts.filter((a) => a.severity === "critical").length;
  const highOpenCount = openAlerts.filter((a) => a.severity === "high").length;
  const threatLevel: SecurityOverview["threatLevel"] = criticalOpenCount > 0 ? "CRITICAL" : highOpenCount > 0 ? "HIGH" : openAlerts.length > 0 ? "MEDIUM" : "LOW";

  return { threatLevel, eventsToday, authFailuresToday, rateLimitEventsToday, regbotAbuseToday, adminEventsToday, openAlertsCount: openAlerts.length, criticalOpenCount };
}

export async function listSecurityAlerts(limit = 50): Promise<SecurityAlertRow[]> {
  const rows = await prisma.securityAlert.findMany({ orderBy: { lastSeenAt: "desc" }, take: limit });
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    severity: r.severity,
    title: r.title,
    summary: r.summary,
    occurrences: r.occurrences,
    status: r.status,
    firstSeenAt: r.firstSeenAt.toISOString(),
    lastSeenAt: r.lastSeenAt.toISOString(),
  }));
}

export async function listSecurityEvents(limit = 100): Promise<SecurityEventRow[]> {
  const rows = await prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((r) => ({
    id: r.id,
    requestId: r.requestId,
    eventType: r.eventType,
    category: r.category,
    severity: r.severity,
    route: r.route,
    ip: r.ip,
    userId: r.userId,
    detail: r.detail,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ───────── Suggestions ───────── */

export interface AdminSuggestionRow {
  id: string;
  authorName: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  severity: string | null;
  relatedPage: string;
  screenshotUrl: string | null;
  status: string;
  ownerId: string | null;
  adminNotes: string;
  targetRelease: string;
  voteCount: number;
  createdAt: string;
}

export async function listSuggestionsForAdmin(): Promise<AdminSuggestionRow[]> {
  const rows = await prisma.suggestion.findMany({ include: { author: { include: { profile: true } } }, orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }], take: 200 });
  return rows.map((r) => ({
    id: r.id,
    authorName: r.author.profile?.displayName ?? r.author.email,
    title: r.title,
    description: r.description,
    category: r.category,
    priority: r.priority,
    severity: r.severity,
    relatedPage: r.relatedPage,
    screenshotUrl: r.screenshotUrl,
    status: r.status,
    ownerId: r.ownerId,
    adminNotes: r.adminNotes,
    targetRelease: r.targetRelease,
    voteCount: r.voteCount,
    createdAt: r.createdAt.toISOString(),
  }));
}
