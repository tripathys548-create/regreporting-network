import { prisma } from "@/lib/db";
import type { Notification } from "@/types";
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
