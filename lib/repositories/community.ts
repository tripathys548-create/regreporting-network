import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommentView, Discussion, DiscussionView, ProfileSummary, TopicSlug, ViewerState } from "@/types";
import { toComment, toDiscussion, toProfileSummary } from "./mappers";

export type DiscussionSort = "trending" | "latest" | "unanswered" | "top";

export interface DiscussionQuery {
  category?: TopicSlug;
  authorId?: string;
  sort?: DiscussionSort;
  limit?: number;
}

const DAY_MS = 86_400_000;

const discussionInclude = {
  author: { include: { profile: true } },
  comments: { where: { status: "published" }, select: { author: { select: { profile: true } } } },
} satisfies Prisma.DiscussionInclude;

type DiscussionRow = Prisma.DiscussionGetPayload<{ include: typeof discussionInclude }>;

/** "Experts participating" = verified practitioners who have replied. */
function toView(row: DiscussionRow): DiscussionView {
  const experts = new Map<string, ProfileSummary>();
  for (const c of row.comments) {
    const p = c.author.profile;
    if (p?.verifiedPractitioner && !experts.has(p.userId)) experts.set(p.userId, toProfileSummary(p));
  }
  const expertList = Array.from(experts.values());
  return {
    ...toDiscussion(row, expertList.map((e) => e.userId)),
    author: row.author.profile ? toProfileSummary(row.author.profile) : null,
    experts: expertList,
  };
}

/** Engagement weighted by recency of activity (half-life ~2 days). */
export function trendingScore(d: Discussion, now: Date = new Date()): number {
  const ageHours = Math.max(0, (now.getTime() - new Date(d.lastActivityAt).getTime()) / 3_600_000);
  const engagement = d.voteScore * 2 + d.replyCount * 3 + d.viewCount / 20 + d.expertParticipantIds.length * 5;
  return engagement * Math.pow(0.5, ageHours / 48);
}

const ORDER: Record<Exclude<DiscussionSort, "trending">, Prisma.DiscussionOrderByWithRelationInput[]> = {
  latest: [{ createdAt: "desc" }],
  top: [{ voteScore: "desc" }, { createdAt: "desc" }],
  unanswered: [{ replyCount: "asc" }, { createdAt: "desc" }],
};

export async function listDiscussions(query: DiscussionQuery = {}): Promise<DiscussionView[]> {
  const sort = query.sort ?? "trending";
  const where: Prisma.DiscussionWhereInput = { status: "published" };
  if (query.category) where.category = query.category;
  if (query.authorId) where.authorId = query.authorId;
  if (sort === "unanswered") where.acceptedCommentId = null;

  if (sort === "trending") {
    // Scored in memory; Phase 3 stores a precomputed trending score for large volumes.
    const rows = await prisma.discussion.findMany({ where, include: discussionInclude });
    const now = new Date();
    const views = rows.map(toView).sort((a, b) => trendingScore(b, now) - trendingScore(a, now));
    return query.limit ? views.slice(0, query.limit) : views;
  }

  const rows = await prisma.discussion.findMany({ where, include: discussionInclude, orderBy: ORDER[sort], take: query.limit });
  return rows.map(toView);
}

export async function getDiscussionBySlug(slug: string): Promise<DiscussionView | null> {
  const row = await prisma.discussion.findFirst({ where: { slug, status: "published" }, include: discussionInclude });
  return row ? toView(row) : null;
}

export async function recordDiscussionView(id: string): Promise<void> {
  await prisma.discussion.update({ where: { id }, data: { viewCount: { increment: 1 } } });
}

export async function listComments(discussionId: string, viewerId: string | null): Promise<CommentView[]> {
  const rows = await prisma.comment.findMany({
    where: { discussionId, status: "published" },
    include: { author: { include: { profile: true } }, votes: { where: { userId: viewerId ?? "" }, select: { userId: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    ...toComment(row),
    author: row.author.profile ? toProfileSummary(row.author.profile) : null,
    viewerUpvoted: row.votes.length > 0,
  }));
}

export async function getViewerState(discussionId: string, userId: string | null): Promise<ViewerState> {
  if (!userId) return { upvoted: false, saved: false, following: false };
  const [vote, save, follow] = await Promise.all([
    prisma.discussionVote.findUnique({ where: { userId_discussionId: { userId, discussionId } } }),
    prisma.savedDiscussion.findUnique({ where: { userId_discussionId: { userId, discussionId } } }),
    prisma.userFollow.findUnique({ where: { followerId_targetType_targetId: { followerId: userId, targetType: "discussion", targetId: discussionId } } }),
  ]);
  return { upvoted: Boolean(vote), saved: Boolean(save), following: Boolean(follow) };
}

export async function listMostDiscussedThisWeek(limit = 5): Promise<DiscussionView[]> {
  const rows = await prisma.discussion.findMany({
    where: { status: "published", lastActivityAt: { gte: new Date(Date.now() - 7 * DAY_MS) } },
    include: discussionInclude,
    orderBy: [{ replyCount: "desc" }, { viewCount: "desc" }],
    take: limit,
  });
  return rows.map(toView);
}

export async function countActiveDiscussions(days = 7): Promise<number> {
  return prisma.discussion.count({ where: { status: "published", lastActivityAt: { gte: new Date(Date.now() - days * DAY_MS) } } });
}

export async function listDiscussionsByTopics(topics: TopicSlug[], limit = 3): Promise<DiscussionView[]> {
  const rows = await prisma.discussion.findMany({
    where: { status: "published", category: { in: topics } },
    include: discussionInclude,
    orderBy: { voteScore: "desc" },
    take: limit,
  });
  return rows.map(toView);
}

export async function countDiscussionsByCategory(): Promise<Map<TopicSlug, number>> {
  const groups = await prisma.discussion.groupBy({ by: ["category"], where: { status: "published" }, _count: { _all: true } });
  return new Map(groups.map((g) => [g.category as TopicSlug, g._count._all]));
}

export async function listSavedDiscussions(userId: string): Promise<DiscussionView[]> {
  const saves = await prisma.savedDiscussion.findMany({
    where: { userId, discussion: { status: "published" } },
    include: { discussion: { include: discussionInclude } },
    orderBy: { createdAt: "desc" },
  });
  return saves.map((s) => toView(s.discussion));
}
