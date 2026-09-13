import { MILESTONES } from "@/data/milestones";
import { daysUntil } from "@/lib/format";
import type { Jurisdiction, RegulatoryMilestone } from "@/types";

export interface MilestoneQuery {
  jurisdiction?: Jurisdiction;
  includePast?: boolean;
  limit?: number;
}

export async function listMilestones(query: MilestoneQuery = {}, now: Date = new Date()): Promise<RegulatoryMilestone[]> {
  const results = MILESTONES.filter(
    (m) => (!query.jurisdiction || m.jurisdiction === query.jurisdiction) && (query.includePast || daysUntil(m.date, now) >= 0),
  ).sort((a, b) => a.date.localeCompare(b.date));
  return query.limit ? results.slice(0, query.limit) : results;
}
