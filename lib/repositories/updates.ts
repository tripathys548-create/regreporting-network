import type { Prisma } from "@prisma/client";
import { SOURCES } from "@/data/sources";
import { prisma } from "@/lib/db";
import type { ContentStatus, RegulatoryAlert, RegulatoryUpdate, TopicSlug } from "@/types";
import { toRegulatoryUpdate } from "./mappers";

export interface UpdateQuery {
  sourceId?: string;
  topic?: TopicSlug;
  /** Admin views include pending, rejected and archived items. */
  statuses?: ContentStatus[];
  limit?: number;
}

export async function listUpdates(query: UpdateQuery = {}): Promise<RegulatoryUpdate[]> {
  const where: Prisma.RegulatoryUpdateWhereInput = { status: { in: query.statuses ?? ["published"] } };
  if (query.sourceId) where.sourceId = query.sourceId;
  if (query.topic) where.topics = { has: query.topic };
  const rows = await prisma.regulatoryUpdate.findMany({ where, orderBy: { publishedAt: "desc" }, take: query.limit });
  return rows.map(toRegulatoryUpdate);
}

export async function getUpdate(id: string): Promise<RegulatoryUpdate | null> {
  const row = await prisma.regulatoryUpdate.findFirst({ where: { id, status: "published" } });
  return row ? toRegulatoryUpdate(row) : null;
}

/** Most recent published update per source. */
export async function getLatestUpdateBySource(): Promise<Map<string, RegulatoryUpdate>> {
  const rows = await prisma.regulatoryUpdate.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, distinct: ["sourceId"] });
  return new Map(rows.map((r) => [r.sourceId, toRegulatoryUpdate(r)]));
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, standard: 2 };

/** The single alert shown in the global banner: highest severity, then newest. */
export async function getActiveAlert(): Promise<RegulatoryUpdate | null> {
  const rows = await prisma.regulatoryUpdate.findMany({ where: { status: "published", isAlert: true }, orderBy: { publishedAt: "desc" }, take: 20 });
  rows.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3) || b.publishedAt.getTime() - a.publishedAt.getTime());
  return rows[0] ? toRegulatoryUpdate(rows[0]) : null;
}

export async function getRegulatoryAlert(): Promise<RegulatoryAlert | null> {
  const update = await getActiveAlert();
  if (!update) return null;
  const source = SOURCES.find((s) => s.id === update.sourceId);
  return { update, sourceShortName: source?.shortName ?? "Regulator" };
}

export async function countUpdatesSince(days: number): Promise<number> {
  return prisma.regulatoryUpdate.count({ where: { status: "published", publishedAt: { gte: new Date(Date.now() - days * 86_400_000) } } });
}
