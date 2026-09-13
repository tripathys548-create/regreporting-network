/**
 * Progressive controls. A single suspicious signal never bans anyone —
 * it moves a target (user or IP/session "source") one step along:
 *
 *   normal → watch → rate-limited → challenge → restricted → admin review
 *
 * Levels are stored as SecurityRestriction rows with an expiry; they lapse on
 * their own unless an admin extends or lifts them. Only "restricted" actually
 * blocks requests (see `isRestricted`); earlier levels only inform monitoring
 * and stricter rate limits.
 */
import { prisma } from "@/lib/db";
import { securityConfig } from "./config";

export type RestrictionLevel = "watch" | "rate-limited" | "challenge" | "restricted";
export type RestrictionTargetType = "user" | "source";

const LEVEL_ORDER: RestrictionLevel[] = ["watch", "rate-limited", "challenge", "restricted"];

const LEVEL_DURATION_MS: Record<RestrictionLevel, number> = {
  watch: securityConfig.restrictionDurations.watchMs,
  "rate-limited": securityConfig.restrictionDurations.rateLimitedMs,
  challenge: securityConfig.restrictionDurations.challengeMs,
  restricted: securityConfig.restrictionDurations.restrictedMs,
};

/** Escalate a target by one level (or apply the given level directly if higher than current). */
export async function escalate(
  targetType: RestrictionTargetType,
  targetId: string,
  minLevel: RestrictionLevel,
  reason: string,
): Promise<RestrictionLevel> {
  const current = await getActiveLevel(targetType, targetId);
  const currentIndex = current ? LEVEL_ORDER.indexOf(current) : -1;
  const minIndex = LEVEL_ORDER.indexOf(minLevel);
  const nextIndex = Math.min(Math.max(currentIndex + 1, minIndex), LEVEL_ORDER.length - 1);
  const nextLevel = LEVEL_ORDER[nextIndex];

  await prisma.securityRestriction.create({
    data: {
      targetType,
      targetId,
      level: nextLevel,
      reason: reason.slice(0, 500),
      expiresAt: new Date(Date.now() + LEVEL_DURATION_MS[nextLevel]),
    },
  });
  return nextLevel;
}

export async function getActiveLevel(targetType: RestrictionTargetType, targetId: string): Promise<RestrictionLevel | null> {
  const row = await prisma.securityRestriction.findFirst({
    where: { targetType, targetId, liftedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return (row?.level as RestrictionLevel) ?? null;
}

export async function isRestricted(targetType: RestrictionTargetType, targetId: string): Promise<boolean> {
  return (await getActiveLevel(targetType, targetId)) === "restricted";
}

/** Admin-initiated restriction — always audited by the caller (see app/api/admin/security/route.ts). */
export async function applyAdminRestriction(
  targetType: RestrictionTargetType,
  targetId: string,
  level: RestrictionLevel,
  reason: string,
  durationMs: number = securityConfig.restrictionDurations.defaultAdminRestrictionMs,
): Promise<void> {
  await prisma.securityRestriction.create({
    data: { targetType, targetId, level, reason: reason.slice(0, 500), expiresAt: new Date(Date.now() + durationMs) },
  });
}

export async function liftRestriction(id: string): Promise<void> {
  await prisma.securityRestriction.update({ where: { id }, data: { liftedAt: new Date() } });
}
