import { randomBytes } from "node:crypto";
import { SOURCES } from "@/data/sources";
import { isTopicSlug } from "@/data/topics";
import { prisma } from "@/lib/db";
import { filterByPreference } from "@/lib/repositories/notifications";
import { excerpt } from "@/lib/text";
import type { FollowTargetType, NewCommentInput, NewDiscussionInput, ReportReason, VoteTarget } from "@/types";

/*
 * Write operations for the community. Route Handlers authorise the caller;
 * these functions enforce ownership and integrity rules and keep
 * denormalised counters (replyCount, voteScore) consistent in transactions.
 */

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = (status: number, error: string) => ({ ok: false as const, status, error });

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70)
    .replace(/-+$/, "");
  return `${base || "discussion"}-${randomBytes(3).toString("hex")}`;
}

export async function createDiscussion(authorId: string, input: NewDiscussionInput): Promise<ServiceResult<{ slug: string }>> {
  const slug = slugify(input.title);
  const discussion = await prisma.$transaction(async (tx) => {
    const created = await tx.discussion.create({
      data: {
        slug,
        title: input.title,
        body: input.body,
        authorId,
        category: input.category,
        tags: input.tags,
        origin: input.linkedChatSessionId ? "regbot-escalation" : "member",
      },
    });
    // Authors follow their own discussions so they hear about replies from other followers' activity too.
    await tx.userFollow.create({ data: { followerId: authorId, targetType: "discussion", targetId: created.id } });
    return created;
  });

  // Notify members who follow this topic, respecting their notification preference.
  const topicFollowers = await prisma.userFollow.findMany({ where: { targetType: "topic", targetId: input.category }, select: { followerId: true } });
  const notifiable = await filterByPreference(
    topicFollowers.map((f) => f.followerId).filter((id) => id !== authorId),
    "followedTopics",
  );
  if (notifiable.length) {
    await prisma.notification.createMany({
      data: notifiable.map((userId) => ({
        userId,
        type: "followed-topic",
        title: "New discussion in a topic you follow",
        body: discussion.title,
        href: `/community/${slug}`,
      })),
    });
  }

  return { ok: true, value: { slug } };
}

const MENTION_PATTERN = /@([a-z0-9][a-z0-9-]{1,40})/g;

export async function createComment(discussionId: string, authorId: string, input: NewCommentInput): Promise<ServiceResult<{ id: string }>> {
  const discussion = await prisma.discussion.findUnique({ where: { id: discussionId } });
  if (!discussion || discussion.status !== "published") return fail(404, "Discussion not found.");

  // Threads are one level deep: replying to a reply attaches to its root.
  let parentId: string | null = null;
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({ where: { id: input.parentId } });
    if (!parent || parent.discussionId !== discussionId) return fail(400, "The reply you are responding to no longer exists.");
    parentId = parent.parentId ?? parent.id;
  }

  const author = await prisma.profile.findUnique({ where: { userId: authorId } });
  const authorName = author?.displayName ?? "A member";

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({ data: { discussionId, authorId, parentId, body: input.body } });
    await tx.discussion.update({ where: { id: discussionId }, data: { replyCount: { increment: 1 }, lastActivityAt: new Date() } });
    await tx.userFollow.upsert({
      where: { followerId_targetType_targetId: { followerId: authorId, targetType: "discussion", targetId: discussionId } },
      create: { followerId: authorId, targetType: "discussion", targetId: discussionId },
      update: {},
    });
    return created;
  });

  // Notifications: discussion author, other followers, and @mentions. Never notify the replier.
  // Each group is filtered against the recipient's own notification preference before being queued.
  const href = `/community/${discussion.slug}#${comment.id}`;
  const notified = new Set<string>([authorId]);
  const rows: { userId: string; type: string; title: string; body: string; href: string }[] = [];

  if (!notified.has(discussion.authorId) && (await filterByPreference([discussion.authorId], "replies")).length) {
    rows.push({ userId: discussion.authorId, type: "reply", title: `${authorName} replied`, body: discussion.title, href });
    notified.add(discussion.authorId);
  }

  const handles = Array.from(new Set(Array.from(input.body.matchAll(MENTION_PATTERN), (m) => m[1])));
  if (handles.length) {
    const mentioned = await prisma.profile.findMany({ where: { handle: { in: handles } } });
    const mentionable = await filterByPreference(
      mentioned.map((p) => p.userId).filter((id) => !notified.has(id)),
      "mentions",
    );
    for (const userId of mentionable) {
      rows.push({ userId, type: "mention", title: `${authorName} mentioned you`, body: excerpt(input.body, 120), href });
      notified.add(userId);
    }
  }

  const followers = await prisma.userFollow.findMany({ where: { targetType: "discussion", targetId: discussionId } });
  const followersNotifiable = await filterByPreference(
    followers.map((f) => f.followerId).filter((id) => !notified.has(id)),
    "followedDiscussions",
  );
  for (const userId of followersNotifiable) {
    rows.push({ userId, type: "followed-discussion", title: "New reply in a discussion you follow", body: discussion.title, href });
    notified.add(userId);
  }

  if (rows.length) await prisma.notification.createMany({ data: rows });
  return { ok: true, value: { id: comment.id } };
}

export async function toggleUpvote(target: VoteTarget, targetId: string, userId: string): Promise<ServiceResult<{ upvoted: boolean; voteScore: number }>> {
  if (target === "discussion") {
    const discussion = await prisma.discussion.findUnique({ where: { id: targetId } });
    if (!discussion || discussion.status !== "published") return fail(404, "Discussion not found.");
    if (discussion.authorId === userId) return fail(400, "You cannot upvote your own discussion.");

    return prisma.$transaction(async (tx) => {
      const key = { userId_discussionId: { userId, discussionId: targetId } };
      const existing = await tx.discussionVote.findUnique({ where: key });
      if (existing) await tx.discussionVote.delete({ where: key });
      else await tx.discussionVote.create({ data: { userId, discussionId: targetId } });
      const updated = await tx.discussion.update({ where: { id: targetId }, data: { voteScore: { increment: existing ? -1 : 1 } } });
      return { ok: true as const, value: { upvoted: !existing, voteScore: updated.voteScore } };
    });
  }

  const comment = await prisma.comment.findUnique({ where: { id: targetId } });
  if (!comment || comment.status !== "published") return fail(404, "Reply not found.");
  if (comment.authorId === userId) return fail(400, "You cannot upvote your own reply.");

  return prisma.$transaction(async (tx) => {
    const key = { userId_commentId: { userId, commentId: targetId } };
    const existing = await tx.commentVote.findUnique({ where: key });
    if (existing) await tx.commentVote.delete({ where: key });
    else await tx.commentVote.create({ data: { userId, commentId: targetId } });
    const updated = await tx.comment.update({ where: { id: targetId }, data: { voteScore: { increment: existing ? -1 : 1 } } });
    return { ok: true as const, value: { upvoted: !existing, voteScore: updated.voteScore } };
  });
}

export async function toggleSave(discussionId: string, userId: string): Promise<ServiceResult<{ saved: boolean }>> {
  const discussion = await prisma.discussion.findUnique({ where: { id: discussionId } });
  if (!discussion) return fail(404, "Discussion not found.");
  const key = { userId_discussionId: { userId, discussionId } };
  const existing = await prisma.savedDiscussion.findUnique({ where: key });
  if (existing) await prisma.savedDiscussion.delete({ where: key });
  else await prisma.savedDiscussion.create({ data: { userId, discussionId } });
  return { ok: true, value: { saved: !existing } };
}

async function followTargetExists(targetType: FollowTargetType, targetId: string): Promise<boolean> {
  switch (targetType) {
    case "user":
      return Boolean(await prisma.user.findFirst({ where: { id: targetId, status: "active" } }));
    case "discussion":
      return Boolean(await prisma.discussion.findUnique({ where: { id: targetId } }));
    case "source":
      return SOURCES.some((s) => s.id === targetId);
    case "topic":
      return isTopicSlug(targetId);
  }
}

export async function toggleFollow(followerId: string, targetType: FollowTargetType, targetId: string): Promise<ServiceResult<{ following: boolean }>> {
  if (targetType === "user" && targetId === followerId) return fail(400, "You cannot follow yourself.");
  if (!(await followTargetExists(targetType, targetId))) return fail(404, "Nothing to follow.");
  const key = { followerId_targetType_targetId: { followerId, targetType, targetId } };
  const existing = await prisma.userFollow.findUnique({ where: key });
  if (existing) await prisma.userFollow.delete({ where: key });
  else await prisma.userFollow.create({ data: { followerId, targetType, targetId } });
  return { ok: true, value: { following: !existing } };
}

/** Only the discussion author can accept an answer; accepting again removes it. */
export async function toggleAcceptedAnswer(commentId: string, userId: string): Promise<ServiceResult<{ accepted: boolean }>> {
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, include: { discussion: true } });
  if (!comment || comment.status !== "published") return fail(404, "Reply not found.");
  if (comment.discussion.authorId !== userId) return fail(403, "Only the person who asked can accept an answer.");

  const accepting = !comment.isAccepted;
  await prisma.$transaction([
    prisma.comment.updateMany({ where: { discussionId: comment.discussionId, isAccepted: true }, data: { isAccepted: false } }),
    ...(accepting ? [prisma.comment.update({ where: { id: commentId }, data: { isAccepted: true } })] : []),
    prisma.discussion.update({ where: { id: comment.discussionId }, data: { acceptedCommentId: accepting ? commentId : null } }),
  ]);

  if (accepting && comment.authorId !== userId) {
    await prisma.notification.create({
      data: { userId: comment.authorId, type: "reply", title: "Your answer was accepted", body: comment.discussion.title, href: `/community/${comment.discussion.slug}#${commentId}` },
    });
  }
  return { ok: true, value: { accepted: accepting } };
}

export async function createReport(
  reporterId: string,
  input: { targetType: "discussion" | "comment" | "profile"; targetId: string; reason: ReportReason; detail: string },
): Promise<ServiceResult<{ alreadyReported: boolean }>> {
  const exists =
    input.targetType === "discussion"
      ? await prisma.discussion.findUnique({ where: { id: input.targetId } })
      : input.targetType === "comment"
        ? await prisma.comment.findUnique({ where: { id: input.targetId } })
        : await prisma.user.findUnique({ where: { id: input.targetId } });
  if (!exists) return fail(404, "The reported content no longer exists.");

  const key = { reporterId_targetType_targetId: { reporterId, targetType: input.targetType, targetId: input.targetId } };
  const existing = await prisma.contentReport.findUnique({ where: key });
  if (existing) return { ok: true, value: { alreadyReported: true } };
  await prisma.contentReport.create({ data: { reporterId, ...input } });
  return { ok: true, value: { alreadyReported: false } };
}
