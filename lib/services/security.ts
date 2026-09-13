/*
 * Admin security actions (section 13/14 of the security spec). Every action
 * writes an AuditLog row. Route Handlers enforce admin-only access
 * (app/api/admin/security/route.ts) — these functions only enforce integrity.
 */
import { prisma } from "@/lib/db";
import { applyAdminRestriction, liftRestriction, type RestrictionLevel } from "@/lib/security/restrictions";
import { securityConfig } from "@/lib/security/config";
import type { ServiceResult } from "./community";

const fail = (status: number, error: string) => ({ ok: false as const, status, error });

async function audit(actorId: string, action: string, targetType: string, targetId: string, detail = "", requestId?: string) {
  await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, detail: detail.slice(0, 1000), requestId } });
}

export async function markEventReviewed(actorId: string, eventId: string, note: string, requestId: string): Promise<ServiceResult<{ status: string }>> {
  const event = await prisma.securityEvent.findUnique({ where: { id: eventId } });
  if (!event) return fail(404, "Security event not found.");
  await prisma.securityEvent.update({ where: { id: eventId }, data: { status: "reviewed", reviewedById: actorId, reviewNote: note.slice(0, 500) } });
  await audit(actorId, "security.event.review", "security-event", eventId, note, requestId);
  return { ok: true, value: { status: "reviewed" } };
}

export async function resolveAlert(actorId: string, alertId: string, note: string, requestId: string): Promise<ServiceResult<{ status: string }>> {
  const alert = await prisma.securityAlert.findUnique({ where: { id: alertId } });
  if (!alert) return fail(404, "Alert not found.");
  await prisma.securityAlert.update({ where: { id: alertId }, data: { status: "resolved", resolutionNote: note.slice(0, 500) } });
  await audit(actorId, "security.alert.resolve", "security-alert", alertId, note, requestId);
  return { ok: true, value: { status: "resolved" } };
}

export async function escalateAlert(actorId: string, alertId: string, note: string, requestId: string): Promise<ServiceResult<{ status: string }>> {
  const alert = await prisma.securityAlert.findUnique({ where: { id: alertId } });
  if (!alert) return fail(404, "Alert not found.");
  await prisma.securityAlert.update({ where: { id: alertId }, data: { status: "escalated", assignedToId: actorId, resolutionNote: note.slice(0, 500) } });
  await audit(actorId, "security.alert.escalate", "security-alert", alertId, note, requestId);
  return { ok: true, value: { status: "escalated" } };
}

const RESTRICTION_LEVELS: RestrictionLevel[] = ["watch", "rate-limited", "challenge", "restricted"];

export async function restrictTarget(
  actorId: string,
  targetType: "user" | "source",
  targetId: string,
  level: string,
  reason: string,
  durationMs: number | undefined,
  requestId: string,
): Promise<ServiceResult<{ level: RestrictionLevel }>> {
  const next = RESTRICTION_LEVELS.find((l) => l === level);
  if (!next) return fail(422, "Unknown restriction level.");
  if (!reason.trim()) return fail(400, "A reason is required for a restriction.");
  if (targetType === "user") {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) return fail(404, "User not found.");
    if (user.role === "admin") return fail(400, "Admins cannot be restricted this way — change their role instead.");
  }
  await applyAdminRestriction(targetType, targetId, next, reason, durationMs ?? securityConfig.restrictionDurations.defaultAdminRestrictionMs);
  await audit(
    actorId,
    "security.restrict",
    targetType,
    targetId,
    `level=${next} reason=${reason} durationMs=${durationMs ?? securityConfig.restrictionDurations.defaultAdminRestrictionMs}`,
    requestId,
  );
  return { ok: true, value: { level: next } };
}

export async function liftRestrictionAsAdmin(actorId: string, restrictionId: string, requestId: string): Promise<ServiceResult<{ lifted: true }>> {
  const restriction = await prisma.securityRestriction.findUnique({ where: { id: restrictionId } });
  if (!restriction) return fail(404, "Restriction not found.");
  await liftRestriction(restrictionId);
  await audit(actorId, "security.restriction.lift", restriction.targetType, restriction.targetId, "", requestId);
  return { ok: true, value: { lifted: true } };
}
