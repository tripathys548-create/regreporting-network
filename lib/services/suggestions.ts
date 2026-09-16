/*
 * Suggestion system (💡 Suggest an Improvement). Users submit; admins triage
 * in /admin?section=suggestions. The "security" category gets special
 * handling in the UI (a warning not to include secrets) — see
 * components/SuggestionForm.tsx and /security for full responsible-disclosure
 * guidance on actual vulnerabilities.
 */
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import type { ServiceResult } from "./community";

const fail = (status: number, error: string) => ({ ok: false as const, status, error });

export const SUGGESTION_CATEGORIES = ["feature", "bug", "security", "content", "other"] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const SUGGESTION_PRIORITIES = ["low", "normal", "high"] as const;
export type SuggestionPriority = (typeof SUGGESTION_PRIORITIES)[number];

export const SUGGESTION_SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type SuggestionSeverity = (typeof SUGGESTION_SEVERITIES)[number];

const SUGGESTION_STATUSES = ["open", "under-review", "planned", "in-progress", "shipped", "declined", "duplicate"] as const;

export interface NewSuggestionInput {
  title: string;
  description: string;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  relatedPage: string;
  screenshotUrl: string | null;
  severity: SuggestionSeverity | null;
  stepsToReproduce: string;
}

function asRecord(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

export function validateNewSuggestion(input: unknown): { ok: true; value: NewSuggestionInput } | { ok: false; error: string } {
  const raw = asRecord(input);
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const category = SUGGESTION_CATEGORIES.find((c) => c === raw.category);
  const priority = SUGGESTION_PRIORITIES.find((p) => p === raw.priority) ?? "normal";
  const relatedPage = typeof raw.relatedPage === "string" ? raw.relatedPage.trim().slice(0, 300) : "";
  const screenshotUrl = typeof raw.screenshotUrl === "string" && raw.screenshotUrl.trim() ? raw.screenshotUrl.trim().slice(0, 500) : null;
  const severity = SUGGESTION_SEVERITIES.find((s) => s === raw.severity) ?? null;
  const stepsToReproduce = typeof raw.stepsToReproduce === "string" ? raw.stepsToReproduce.trim().slice(0, 2000) : "";

  if (title.length < 8 || title.length > 200) return { ok: false, error: "Title must be 8–200 characters." };
  if (description.length < 20 || description.length > 3000) return { ok: false, error: "Description must be 20–3000 characters." };
  if (!category) return { ok: false, error: "Choose a category." };
  if (category === "security" && stepsToReproduce.length < 10) {
    return { ok: false, error: "For a security suggestion, describe steps to reproduce (at least 10 characters)." };
  }
  // Basic secret-leak guard: reject obvious credential-shaped strings rather than silently storing them.
  const secretLike = /(api[_-]?key|secret|password)\s*[:=]\s*\S+/i;
  if (secretLike.test(description) || secretLike.test(stepsToReproduce)) {
    return { ok: false, error: "Please remove anything that looks like a password, API key, or secret before submitting." };
  }

  return { ok: true, value: { title, description, category, priority, relatedPage, screenshotUrl, severity: category === "security" ? severity : null, stepsToReproduce } };
}

export async function createSuggestion(authorId: string, input: NewSuggestionInput): Promise<ServiceResult<{ id: string }>> {
  const row = await prisma.suggestion.create({ data: { authorId, ...input } });
  await notifyAdminsOfSuggestion(row.id, authorId, input);
  return { ok: true, value: { id: row.id } };
}

/**
 * Emails every admin (and drops an in-app notification) whenever a member
 * submits a suggestion, so it doesn't sit unseen until someone happens to
 * open /admin?section=suggestions. Best-effort: a delivery failure here must
 * never fail the suggestion submission itself.
 */
async function notifyAdminsOfSuggestion(suggestionId: string, authorId: string, input: NewSuggestionInput): Promise<void> {
  try {
    const [author, admins] = await Promise.all([
      prisma.profile.findUnique({ where: { userId: authorId }, select: { displayName: true } }),
      prisma.user.findMany({ where: { role: "admin", status: "active" }, select: { id: true, email: true } }),
    ]);
    if (admins.length === 0) return;

    const authorName = author?.displayName ?? "A member";
    const isSecurity = input.category === "security";
    const subject = `${isSecurity ? "[Security] " : ""}New suggestion: ${input.title}`;
    const text = [
      `${authorName} submitted a ${input.category} suggestion (priority: ${input.priority}).`,
      "",
      input.title,
      "",
      input.description,
      input.relatedPage ? `\nAffected page: ${input.relatedPage}` : "",
      isSecurity && input.severity ? `\nSeverity: ${input.severity}` : "",
      isSecurity && input.stepsToReproduce ? `\nSteps to reproduce:\n${input.stepsToReproduce}` : "",
      `\nReview at /admin?section=suggestions`,
    ]
      .filter(Boolean)
      .join("\n");

    await Promise.all([
      ...admins.map((admin) => sendEmail({ to: admin.email, subject, text })),
      prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "suggestion",
          title: isSecurity ? "🔒 New security suggestion" : "💡 New suggestion",
          body: `${authorName}: ${input.title}`,
          href: `/admin?section=suggestions`,
        })),
      }),
    ]);
  } catch (error) {
    console.error(`[${suggestionId}] Failed to notify admins of new suggestion:`, error instanceof Error ? error.message : error);
  }
}

export async function toggleSuggestionVote(userId: string, suggestionId: string): Promise<ServiceResult<{ voted: boolean; voteCount: number }>> {
  const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) return fail(404, "Suggestion not found.");

  const existing = await prisma.suggestionVote.findUnique({ where: { userId_suggestionId: { userId, suggestionId } } });
  if (existing) {
    await prisma.$transaction([
      prisma.suggestionVote.delete({ where: { userId_suggestionId: { userId, suggestionId } } }),
      prisma.suggestion.update({ where: { id: suggestionId }, data: { voteCount: { decrement: 1 } } }),
    ]);
    return { ok: true, value: { voted: false, voteCount: Math.max(0, suggestion.voteCount - 1) } };
  }

  await prisma.$transaction([
    prisma.suggestionVote.create({ data: { userId, suggestionId } }),
    prisma.suggestion.update({ where: { id: suggestionId }, data: { voteCount: { increment: 1 } } }),
  ]);
  return { ok: true, value: { voted: true, voteCount: suggestion.voteCount + 1 } };
}

export interface SuggestionUpdateInput {
  status?: string;
  ownerId?: string | null;
  adminNotes?: string;
  targetRelease?: string;
}

async function auditAdmin(actorId: string, action: string, targetId: string, detail = "") {
  await prisma.auditLog.create({ data: { actorId, action, targetType: "suggestion", targetId, detail: detail.slice(0, 1000) } });
}

export async function updateSuggestion(actorId: string, suggestionId: string, input: SuggestionUpdateInput): Promise<ServiceResult<{ id: string }>> {
  const suggestion = await prisma.suggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) return fail(404, "Suggestion not found.");
  if (input.status && !SUGGESTION_STATUSES.includes(input.status as (typeof SUGGESTION_STATUSES)[number])) return fail(422, "Unknown status.");

  await prisma.suggestion.update({
    where: { id: suggestionId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
      ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes.slice(0, 2000) } : {}),
      ...(input.targetRelease !== undefined ? { targetRelease: input.targetRelease.slice(0, 100) } : {}),
    },
  });
  await auditAdmin(actorId, "suggestion.update", suggestionId, JSON.stringify(input).slice(0, 500));
  return { ok: true, value: { id: suggestionId } };
}
