import { prisma } from "@/lib/db";
import type { Profile, ProfileStats, ProfileSummary, User } from "@/types";
import { EMPTY_STATS, toProfile, toProfileSummary, toUser } from "./mappers";

/**
 * Phase 2 reputation: accepted answers weigh most, then upvotes received,
 * then participation. Phase 5 replaces this with an audited reputation ledger.
 */
function reputationFor(accepted: number, upvotesReceived: number, contributions: number): number {
  return Math.max(0, accepted * 15 + upvotesReceived * 2 + contributions);
}

export async function computeStats(userIds: string[]): Promise<Map<string, ProfileStats>> {
  const ids = Array.from(new Set(userIds));
  const stats = new Map<string, ProfileStats>(ids.map((id) => [id, { ...EMPTY_STATS }]));
  if (ids.length === 0) return stats;

  const [discussions, comments, accepted, followers] = await Promise.all([
    prisma.discussion.groupBy({ by: ["authorId"], where: { authorId: { in: ids }, status: "published" }, _count: { _all: true }, _sum: { voteScore: true } }),
    prisma.comment.groupBy({ by: ["authorId"], where: { authorId: { in: ids }, status: "published" }, _count: { _all: true }, _sum: { voteScore: true } }),
    prisma.comment.groupBy({ by: ["authorId"], where: { authorId: { in: ids }, status: "published", isAccepted: true }, _count: { _all: true } }),
    prisma.userFollow.groupBy({ by: ["targetId"], where: { targetType: "user", targetId: { in: ids } }, _count: { _all: true } }),
  ]);

  const upvotes = new Map<string, number>();
  for (const d of discussions) {
    const s = stats.get(d.authorId)!;
    s.contributions += d._count._all;
    upvotes.set(d.authorId, (upvotes.get(d.authorId) ?? 0) + (d._sum.voteScore ?? 0));
  }
  for (const c of comments) {
    const s = stats.get(c.authorId)!;
    s.contributions += c._count._all;
    upvotes.set(c.authorId, (upvotes.get(c.authorId) ?? 0) + (c._sum.voteScore ?? 0));
  }
  for (const a of accepted) stats.get(a.authorId)!.helpfulAnswers = a._count._all;
  for (const f of followers) stats.get(f.targetId)!.followers = f._count._all;
  for (const [id, s] of stats) s.reputation = reputationFor(s.helpfulAnswers, upvotes.get(id) ?? 0, s.contributions);

  return stats;
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const row = await prisma.profile.findUnique({ where: { handle }, include: { user: true } });
  if (!row || row.user.status === "suspended") return null;
  const stats = await computeStats([row.userId]);
  return toProfile(row, stats.get(row.userId));
}

export async function getProfileSummaries(userIds: string[]): Promise<Map<string, ProfileSummary>> {
  const rows = await prisma.profile.findMany({ where: { userId: { in: userIds } } });
  return new Map(rows.map((r) => [r.userId, toProfileSummary(r)]));
}

/** Verified, active practitioners ranked by helpful answers, then reputation. */
export async function listTopContributors(limit = 5): Promise<Profile[]> {
  const rows = await prisma.profile.findMany({ where: { verifiedPractitioner: true, user: { status: "active" } } });
  const stats = await computeStats(rows.map((r) => r.userId));
  return rows
    .map((r) => toProfile(r, stats.get(r.userId)))
    .sort((a, b) => b.stats.helpfulAnswers - a.stats.helpfulAnswers || b.stats.reputation - a.stats.reputation)
    .slice(0, limit);
}

export async function listUsersWithProfiles(): Promise<{ user: User; profile: ProfileSummary | null; organisationName: string | null }[]> {
  const rows = await prisma.user.findMany({ include: { profile: true }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ user: toUser(r), profile: r.profile ? toProfileSummary(r.profile) : null, organisationName: r.profile?.organisationName ?? null }));
}

export async function isFollowing(followerId: string | null, targetType: string, targetId: string): Promise<boolean> {
  if (!followerId) return false;
  const row = await prisma.userFollow.findUnique({ where: { followerId_targetType_targetId: { followerId, targetType, targetId } } });
  return Boolean(row);
}
