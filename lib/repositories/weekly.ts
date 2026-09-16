/**
 * "This Week in Regulatory Reporting" — the single consolidated homepage weekly
 * summary (regulatory updates + community discussions + upcoming deadlines).
 * Assembles counts from the existing regulatory-update, community and
 * milestone repositories rather than introducing a new data source.
 */
import { SOURCES } from "@/data/sources";
import { prisma } from "@/lib/db";
import { countActiveDiscussions } from "./community";
import { listMilestones } from "./timeline";

const DAY_MS = 86_400_000;

export interface WeeklySourceBreakdown {
  sourceId: string;
  shortName: string;
  count: number;
}

export interface WeeklySummary {
  updatesCount: number;
  discussionsCount: number;
  deadlinesCount: number;
  sourceBreakdown: WeeklySourceBreakdown[];
}

const SOURCE_NAME = new Map(SOURCES.map((s) => [s.id, s.shortName]));

export async function getWeeklySummary(): Promise<WeeklySummary> {
  const since = new Date(Date.now() - 7 * DAY_MS);

  const [groups, discussionsCount, upcomingDeadlines] = await Promise.all([
    prisma.regulatoryUpdate.groupBy({ by: ["sourceId"], where: { status: "published", publishedAt: { gte: since } }, _count: { _all: true } }),
    countActiveDiscussions(7),
    // "Upcoming" deadlines use a 30-day look-ahead — milestones are sparse, so a 7-day window would almost always read zero.
    listMilestones({ limit: 50 }),
  ]);

  const sourceBreakdown = groups
    .map((g) => ({ sourceId: g.sourceId, shortName: SOURCE_NAME.get(g.sourceId) ?? g.sourceId, count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  const updatesCount = sourceBreakdown.reduce((sum, s) => sum + s.count, 0);
  const now = Date.now();
  const deadlinesCount = upcomingDeadlines.filter((m) => new Date(m.date).getTime() - now <= 30 * DAY_MS).length;

  return { updatesCount, discussionsCount, deadlinesCount, sourceBreakdown };
}
