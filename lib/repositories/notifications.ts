import { prisma } from "@/lib/db";
import type { Notification, NotificationPreferences } from "@/types";
import { toNotification } from "./mappers";

export async function listNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(toNotification);
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  return result.count;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  replies: true,
  mentions: true,
  followedDiscussions: true,
  followedTopics: true,
  regulatoryUpdates: true,
  knowledgeArticles: true,
  challenges: true,
  adminAnnouncements: true,
  emailDigest: false,
};

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!row) return DEFAULT_PREFERENCES;
  const { userId: _userId, updatedAt: _updatedAt, ...prefs } = row;
  return prefs;
}

export async function updateNotificationPreferences(userId: string, patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
  const row = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_PREFERENCES, ...patch },
    update: patch,
  });
  const { userId: _userId, updatedAt: _updatedAt, ...prefs } = row;
  return prefs;
}

/**
 * Filters a candidate list of user ids down to those who have NOT disabled the given
 * preference (users without a NotificationPreference row default to enabled — see
 * DEFAULT_PREFERENCES). Used by the community-notification fan-out in
 * lib/services/community.ts so `createMany` never writes a notification for someone
 * who opted out in /settings/notifications.
 */
export async function filterByPreference(userIds: string[], key: keyof NotificationPreferences): Promise<string[]> {
  if (userIds.length === 0) return [];
  const disabled = await prisma.notificationPreference.findMany({ where: { userId: { in: userIds }, [key]: false }, select: { userId: true } });
  const disabledSet = new Set(disabled.map((d) => d.userId));
  return userIds.filter((id) => !disabledSet.has(id));
}
