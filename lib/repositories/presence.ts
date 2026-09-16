/**
 * Online member presence. A member counts as "online" when they are
 * authenticated and their session has sent a heartbeat within the
 * configurable window (default 5 minutes — securityConfig.presence.onlineWindowMinutes).
 * Aggregate-only: the public API never returns user ids, emails, sessions, or
 * per-user last-seen — see docs/PRESENCE.md.
 */
import { prisma } from "@/lib/db";
import { securityConfig } from "@/lib/security/config";

const DAY_MS = 86_400_000;
const CACHE_TTL_MS = 15_000;

let cachedCount: { value: number; expiresAt: number } | null = null;

export async function recordHeartbeat(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
}

/** Aggregate online member count, cached briefly so the homepage/community page badge doesn't hit Postgres on every render. */
export async function getOnlineCount(): Promise<number> {
  const now = Date.now();
  if (cachedCount && cachedCount.expiresAt > now) return cachedCount.value;

  const since = new Date(now - securityConfig.presence.onlineWindowMinutes * 60_000);
  const value = await prisma.user.count({ where: { lastSeenAt: { gte: since }, status: "active" } });
  cachedCount = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

export interface PresenceOverview {
  membersOnline: number;
  activeToday: number;
  activeThisWeek: number;
}

/** For the admin dashboard: no caching (admins expect current data), all aggregate counts. */
export async function getPresenceOverview(): Promise<PresenceOverview> {
  const now = Date.now();
  const since = new Date(now - securityConfig.presence.onlineWindowMinutes * 60_000);
  const [membersOnline, activeToday, activeThisWeek] = await Promise.all([
    prisma.user.count({ where: { lastSeenAt: { gte: since }, status: "active" } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - DAY_MS) }, status: "active" } }),
    prisma.user.count({ where: { lastSeenAt: { gte: new Date(now - 7 * DAY_MS) }, status: "active" } }),
  ]);
  return { membersOnline, activeToday, activeThisWeek };
}
