import { SOURCES } from "@/data/sources";
import { isTopicSlug } from "@/data/topics";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { sendWelcomeEmailOnce } from "@/lib/email/welcome";
import { isOnSourceDomain, normaliseUrl } from "@/lib/ingestion/run";
import { filterByPreference } from "@/lib/repositories/notifications";
import type { TopicSlug, UpdateSeverity, UserRole } from "@/types";
import type { ServiceResult } from "./community";

/*
 * Staff actions. Every change writes an AuditLog row. Route Handlers enforce
 * the caller's role; these functions enforce integrity rules (no self-demotion,
 * admins cannot be suspended, counters stay consistent).
 */

const fail = (status: number, error: string) => ({ ok: false as const, status, error });

async function audit(actorId: string, action: string, targetType: string, targetId: string, detail = "") {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, detail: detail.slice(0, 1000) } });
}

/* ───────────── Regulatory updates ───────────── */

export type UpdateReviewAction = "approve" | "reject" | "archive" | "requeue";

const REVIEW_STATUS: Record<UpdateReviewAction, string> = {
  approve: "published",
  reject: "rejected",
  archive: "archived",
  requeue: "pending-review",
};

export async function reviewUpdate(actorId: string, updateId: string, action: UpdateReviewAction, note = ""): Promise<ServiceResult<{ status: string }>> {
  const update = await prisma.regulatoryUpdate.findUnique({ where: { id: updateId } });
  if (!update) return fail(404, "Update not found.");
  const status = REVIEW_STATUS[action];
  if (update.status === status) return { ok: true, value: { status } };

  await prisma.regulatoryUpdate.update({
    where: { id: updateId },
    data: { status, reviewedById: actorId, reviewedAt: new Date(), reviewNote: note || update.reviewNote, ...(status === "published" ? {} : { isAlert: false }) },
  });
  await audit(actorId, `update.${action}`, "update", updateId, note);

  if (status === "published") {
    const source = SOURCES.find((s) => s.id === update.sourceId);
    const followers = await prisma.userFollow.findMany({ where: { targetType: "source", targetId: update.sourceId }, select: { followerId: true } });
    if (followers.length) {
      await prisma.notification.createMany({
        data: followers.map((f) => ({ userId: f.followerId, type: "followed-source", title: `${source?.shortName ?? "A regulator"} published an update`, body: update.title, href: `/radar/${update.id}` })),
      });
    }
  }
  return { ok: true, value: { status } };
}

export interface UpdateEditInput {
  title: string;
  summary: string;
  category: TopicSlug;
  topics: TopicSlug[];
  severity: UpdateSeverity;
  isAlert: boolean;
}

const SEVERITIES: UpdateSeverity[] = ["critical", "high", "standard"];

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

export function validateUpdateEdit(input: unknown): { ok: true; value: UpdateEditInput } | { ok: false; error: string } {
  const raw = asRecord(input);
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const summary = typeof raw.summary === "string" ? raw.summary.trim() : "";
  const category = typeof raw.category === "string" ? raw.category : "";
  const severity = SEVERITIES.find((s) => s === raw.severity);
  const topics = Array.isArray(raw.topics) ? Array.from(new Set(raw.topics.filter((t): t is TopicSlug => typeof t === "string" && isTopicSlug(t)))).slice(0, 6) : [];
  if (title.length < 10 || title.length > 300) return { ok: false, error: "Title must be 10–300 characters." };
  if (summary.length < 20 || summary.length > 1200) return { ok: false, error: "Summary must be 20–1200 characters." };
  if (!isTopicSlug(category)) return { ok: false, error: "Choose a category." };
  if (!severity) return { ok: false, error: "Choose a severity." };
  return { ok: true, value: { title, summary, category, topics: topics.includes(category) ? topics : [category, ...topics].slice(0, 6), severity, isAlert: raw.isAlert === true } };
}

export async function editUpdate(actorId: string, updateId: string, input: UpdateEditInput): Promise<ServiceResult<{ id: string }>> {
  const update = await prisma.regulatoryUpdate.findUnique({ where: { id: updateId } });
  if (!update) return fail(404, "Update not found.");
  if (input.isAlert && update.status !== "published") return fail(400, "Only published updates can be shown in the alert banner.");

  await prisma.regulatoryUpdate.update({ where: { id: updateId }, data: { ...input } });
  const changed = (Object.keys(input) as (keyof UpdateEditInput)[]).filter((k) => JSON.stringify(input[k]) !== JSON.stringify(update[k]));
  await audit(actorId, "update.edit", "update", updateId, changed.length ? `Changed: ${changed.join(", ")}` : "No changes");
  return { ok: true, value: { id: updateId } };
}

export interface ManualUpdateInput extends Omit<UpdateEditInput, "isAlert"> {
  sourceId: string;
  originalUrl: string;
  publishedAt: Date;
}

export function validateManualUpdate(input: unknown): { ok: true; value: ManualUpdateInput } | { ok: false; error: string } {
  const base = validateUpdateEdit({ ...asRecord(input), isAlert: false });
  if (!base.ok) return base;
  const raw = asRecord(input);
  const source = SOURCES.find((s) => s.id === raw.sourceId);
  if (!source) return { ok: false, error: "Choose a source." };
  const url = typeof raw.originalUrl === "string" ? raw.originalUrl.trim() : "";
  if (!isOnSourceDomain(url, source.websiteUrl)) return { ok: false, error: `The link must be an HTTPS page on ${new URL(source.websiteUrl).hostname}.` };
  const publishedAt = typeof raw.publishedAt === "string" ? new Date(`${raw.publishedAt}T12:00:00Z`) : null;
  if (!publishedAt || Number.isNaN(publishedAt.getTime()) || publishedAt.getTime() > Date.now() + 86_400_000) return { ok: false, error: "Enter a valid publication date (not in the future)." };
  const { isAlert: _ignored, ...rest } = base.value;
  return { ok: true, value: { ...rest, sourceId: source.id, originalUrl: normaliseUrl(url), publishedAt } };
}

/** For sources without a feed (e.g. DTCC). Enters the review queue like ingested items. */
export async function createManualUpdate(actorId: string, input: ManualUpdateInput): Promise<ServiceResult<{ id: string }>> {
  if (await prisma.regulatoryUpdate.findUnique({ where: { originalUrl: input.originalUrl } })) return fail(409, "An update with this link already exists.");
  const source = SOURCES.find((s) => s.id === input.sourceId)!;
  const created = await prisma.regulatoryUpdate.create({
    data: { ...input, jurisdiction: source.jurisdiction, status: "pending-review", ingestedFrom: "manual", relevanceScore: 0 },
  });
  await audit(actorId, "update.create", "update", created.id, input.originalUrl);
  return { ok: true, value: { id: created.id } };
}

/* ───────────── Community content ───────────── */

export async function setContentRemoved(actorId: string, targetType: "discussion" | "comment", targetId: string, removed: boolean, reason = ""): Promise<ServiceResult<{ status: string }>> {
  if (removed && reason.trim().length < 5) return fail(422, "Give a short reason for removal (shown to the author).");

  if (targetType === "discussion") {
    const discussion = await prisma.discussion.findUnique({ where: { id: targetId } });
    if (!discussion) return fail(404, "Discussion not found.");
    const status = removed ? "removed" : "published";
    if (discussion.status === status) return { ok: true, value: { status } };
    await prisma.discussion.update({ where: { id: targetId }, data: { status, removedAt: removed ? new Date() : null, removedReason: removed ? reason : null } });
    if (removed) {
      await prisma.notification.create({ data: { userId: discussion.authorId, type: "reply", title: "Your discussion was removed by a moderator", body: `${discussion.title} — Reason: ${reason}`, href: "/community" } });
    }
    await audit(actorId, removed ? "discussion.remove" : "discussion.restore", "discussion", targetId, reason);
    return { ok: true, value: { status } };
  }

  const comment = await prisma.comment.findUnique({ where: { id: targetId }, include: { discussion: true } });
  if (!comment) return fail(404, "Reply not found.");
  const status = removed ? "removed" : "published";
  if (comment.status === status) return { ok: true, value: { status } };

  await prisma.$transaction([
    prisma.comment.update({ where: { id: targetId }, data: { status, removedAt: removed ? new Date() : null, removedReason: removed ? reason : null, ...(removed ? { isAccepted: false } : {}) } }),
    prisma.discussion.update({
      where: { id: comment.discussionId },
      data: { replyCount: { increment: removed ? -1 : 1 }, ...(removed && comment.discussion.acceptedCommentId === targetId ? { acceptedCommentId: null } : {}) },
    }),
  ]);
  if (removed) {
    await prisma.notification.create({ data: { userId: comment.authorId, type: "reply", title: "Your reply was removed by a moderator", body: `In "${comment.discussion.title}" — Reason: ${reason}`, href: `/community/${comment.discussion.slug}` } });
  }
  await audit(actorId, removed ? "comment.remove" : "comment.restore", "comment", targetId, reason);
  return { ok: true, value: { status } };
}

/**
 * Dismiss a report, or action it — optionally removing the reported discussion
 * or reply. Actioning resolves every other open report on the same content.
 */
export async function resolveReport(
  actorId: string,
  reportId: string,
  resolution: "actioned" | "dismissed",
  options: { removeContent?: boolean; note?: string } = {},
): Promise<ServiceResult<{ status: string; resolved: number }>> {
  const report = await prisma.contentReport.findUnique({ where: { id: reportId } });
  if (!report) return fail(404, "Report not found.");
  const note = options.note?.trim() ?? "";

  if (resolution === "actioned" && options.removeContent) {
    if (report.targetType !== "discussion" && report.targetType !== "comment") return fail(400, "Profiles cannot be removed; suspend the member instead.");
    const removed = await setContentRemoved(actorId, report.targetType, report.targetId, true, note);
    if (!removed.ok) return removed;
  }

  const where = resolution === "actioned" ? { targetType: report.targetType, targetId: report.targetId, status: "open" } : { id: reportId };
  const result = await prisma.contentReport.updateMany({ where, data: { status: resolution, resolvedAt: new Date(), resolvedById: actorId, resolution: note || null } });
  await audit(actorId, `report.${resolution}`, "report", reportId, note);
  return { ok: true, value: { status: resolution, resolved: result.count } };
}

/* ───────────── Members ───────────── */

export async function setUserSuspended(actorId: string, userId: string, suspended: boolean, reason = ""): Promise<ServiceResult<{ status: string }>> {
  if (actorId === userId) return fail(400, "You cannot suspend your own account.");
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user) return fail(404, "Member not found.");
  if (suspended && user.role === "admin") return fail(400, "Admins cannot be suspended. Change their role first.");
  if (suspended && reason.trim().length < 5) return fail(422, "Give a reason for the suspension (sent to the member).");

  const status = suspended ? "suspended" : user.emailVerifiedAt ? "active" : "pending";
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { status, suspendedAt: suspended ? new Date() : null, suspendedReason: suspended ? reason : null } }),
    ...(suspended ? [prisma.session.deleteMany({ where: { userId } })] : []),
  ]);
  await audit(actorId, suspended ? "user.suspend" : "user.reinstate", "user", userId, reason);

  await sendEmail({
    to: user.email,
    subject: suspended ? "Your RegReporting Network account has been suspended" : "Your RegReporting Network account has been reinstated",
    text: suspended
      ? `Hello ${user.profile?.displayName ?? ""},\n\nYour account has been suspended by the moderators.\n\nReason: ${reason}\n\nIf you believe this is a mistake, reply to this email.`
      : `Hello ${user.profile?.displayName ?? ""},\n\nYour account has been reinstated. You can sign in again.`,
  });
  return { ok: true, value: { status } };
}

export async function setPractitionerVerified(actorId: string, userId: string, verified: boolean): Promise<ServiceResult<{ verified: boolean }>> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return fail(404, "Member not found.");
  await prisma.profile.update({ where: { userId }, data: { verifiedPractitioner: verified } });
  if (verified) {
    await prisma.notification.create({ data: { userId, type: "reply", title: "You are now a verified practitioner", body: "Your profile shows the verified badge.", href: `/members/${profile.handle}` } });
  }
  await audit(actorId, verified ? "user.verify-practitioner" : "user.unverify-practitioner", "user", userId);
  return { ok: true, value: { verified } };
}

/** Admin-triggered resend, bypassing the one-time welcomeEmailSentAt guard used on normal signup. */
export async function resendWelcomeEmail(actorId: string, userId: string): Promise<ServiceResult<{ delivered: boolean }>> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail(404, "Member not found.");
  const { delivered } = await sendWelcomeEmailOnce(userId, { force: true });
  await audit(actorId, "user.resend-welcome-email", "user", userId, delivered ? "delivered" : "not delivered");
  return { ok: true, value: { delivered } };
}

const ROLES: UserRole[] = ["member", "moderator", "admin"];

export async function setUserRole(actorId: string, userId: string, role: string): Promise<ServiceResult<{ role: UserRole }>> {
  const next = ROLES.find((r) => r === role);
  if (!next) return fail(422, "Unknown role.");
  if (actorId === userId) return fail(400, "You cannot change your own role.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail(404, "Member not found.");
  if (next !== "member" && (!user.emailVerifiedAt || user.status !== "active")) return fail(400, "Only active, email-verified members can become staff.");
  await prisma.user.update({ where: { id: userId }, data: { role: next } });
  await audit(actorId, "user.role", "user", userId, `${user.role} → ${next}`);
  return { ok: true, value: { role: next } };
}

/**
 * Site-wide announcement (spec §9/§25-27's ADMIN_ANNOUNCEMENT notification type):
 * one Notification row per active member who has not disabled adminAnnouncements.
 * `message`'s first line is the title, the rest is the body.
 */
export async function broadcastAnnouncement(actorId: string, message: string): Promise<ServiceResult<{ recipientCount: number }>> {
  const trimmed = message.trim();
  if (trimmed.length < 8) return fail(422, "Write a short announcement (at least 8 characters).");
  if (trimmed.length > 2000) return fail(422, "Keep the announcement under 2000 characters.");

  const [firstLine, ...rest] = trimmed.split("\n");
  const title = firstLine.slice(0, 160);
  const body = (rest.join("\n").trim() || firstLine).slice(0, 1000);

  const activeUsers = await prisma.user.findMany({ where: { status: "active" }, select: { id: true } });
  const notifiable = await filterByPreference(
    activeUsers.map((u) => u.id),
    "adminAnnouncements",
  );

  if (notifiable.length) {
    await prisma.notification.createMany({
      data: notifiable.map((userId) => ({ userId, type: "admin-announcement", title, body, href: "/notifications" })),
    });
  }
  await audit(actorId, "admin.announcement", "notification", "broadcast", `${title} (${notifiable.length} recipients)`);
  return { ok: true, value: { recipientCount: notifiable.length } };
}
