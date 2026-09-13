import { prisma } from "@/lib/db";
import { excerpt, termsMatch } from "@/lib/text";
import type { CommunityView, TopicSlug } from "@/types";

/** Related member discussions for a RegBot answer — shown separately and labelled as member opinion. */
export async function buildCommunityView(tokens: string[], topics: TopicSlug[]): Promise<CommunityView | null> {
  const candidates = await prisma.discussion.findMany({
    where: { status: "published" },
    select: { slug: true, category: true, tags: true, voteScore: true, replyCount: true, acceptedCommentId: true },
  });
  const related = candidates
    .filter((d) => topics.includes(d.category as TopicSlug) || d.tags.some((tag) => tokens.some((t) => termsMatch(t, tag.toLowerCase()))))
    .sort((a, b) => b.voteScore - a.voteScore)
    .slice(0, 3);
  if (related.length === 0) return null;

  const acceptedIds = related.map((d) => d.acceptedCommentId).filter((id): id is string => Boolean(id));
  const accepted = acceptedIds.length ? await prisma.comment.findFirst({ where: { id: { in: acceptedIds }, status: "published" } }) : null;
  const responseCount = related.reduce((sum, d) => sum + d.replyCount, 0);

  return {
    responseCount,
    summary: accepted
      ? `The most-endorsed member answer suggests: "${excerpt(accepted.body, 200)}"`
      : "Members are actively discussing this area, but no answer has been accepted yet.",
    discussionSlugs: related.map((d) => d.slug),
  };
}
