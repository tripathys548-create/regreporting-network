import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentThread } from "@/components/community/CommentThread";
import { DiscussionActions } from "@/components/community/DiscussionActions";
import { DiscussionRow } from "@/components/community/DiscussionRow";
import { ReplyComposer } from "@/components/community/ReplyComposer";
import { ReportButton } from "@/components/community/ReportButton";
import { FollowButton } from "@/components/profile/FollowButton";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, Tag, TopicBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { ShareButton } from "@/components/ui/ShareButton";
import { SourceTypeLabel } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { topicLabel } from "@/data/topics";
import { getSession, getViewerStatus } from "@/lib/auth/session";
import { excerpt } from "@/lib/text";
import { formatCompact } from "@/lib/format";
import { getDiscussionBySlug, getViewerState, listComments, listDiscussions, recordDiscussionView } from "@/lib/repositories/community";
import { listArticles } from "@/lib/repositories/knowledge";
import { isFollowing } from "@/lib/repositories/users";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const discussion = await getDiscussionBySlug(params.slug);
  return { title: discussion?.title ?? "Discussion not found" };
}

export default async function DiscussionPage({ params }: { params: { slug: string } }) {
  const discussion = await getDiscussionBySlug(params.slug);
  if (!discussion) notFound();

  const session = await getSession();
  const userId = session?.user.id ?? null;
  const viewerStatus = getViewerStatus(session);
  const author = discussion.author;
  const isAuthor = userId !== null && userId === discussion.authorId;

  const [comments, related, articles, viewerState, followingAuthor] = await Promise.all([
    listComments(discussion.id, userId),
    listDiscussions({ category: discussion.category, sort: "top", limit: 4 }),
    listArticles(),
    getViewerState(discussion.id, userId),
    author ? isFollowing(userId, "user", author.userId) : Promise.resolve(false),
    recordDiscussionView(discussion.id),
  ]);
  const similar = related.filter((d) => d.id !== discussion.id).slice(0, 3);
  const article = articles.find((a) => a.topic === discussion.category);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_19rem]">
      <div className="min-w-0 space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted">
          <Link href="/community" className="hover:text-ink">
            Community
          </Link>
          <Icon name="chevronRight" className="h-3 w-3" />
          <Link href={`/community?category=${discussion.category}`} className="hover:text-ink">
            {topicLabel(discussion.category)}
          </Link>
        </nav>

        <article className="rounded-md border border-line bg-surface">
          <header className="border-b border-line p-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <TopicBadge topic={discussion.category} href={`/community?category=${discussion.category}`} />
              {discussion.acceptedCommentId && (
                <Badge tone="good">
                  <Icon name="check" className="h-3 w-3" />
                  Accepted answer
                </Badge>
              )}
              {discussion.origin === "regbot-escalation" && <Badge tone="accent">Escalated from RegBot</Badge>}
              <SourceTypeLabel type="community-interpretation" size="xs" />
            </div>
            <h1 className="mt-2 break-words text-xl font-semibold leading-snug text-ink sm:text-2xl">{discussion.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
              {author && (
                <Link href={`/members/${author.handle}`} className="flex items-center gap-2 hover:text-ink">
                  <Avatar initials={author.initials} size="sm" verified={author.verifiedPractitioner} />
                  <span>
                    <span className="block font-semibold text-ink">{author.displayName}</span>
                    <span className="block text-2xs">{author.jobTitle}</span>
                  </span>
                </Link>
              )}
              <span>
                Asked <RelativeTime iso={discussion.createdAt} />
              </span>
              <span className="font-mono">{formatCompact(discussion.viewCount + 1)} views</span>
              <span className="font-mono">
                {discussion.replyCount} {discussion.replyCount === 1 ? "reply" : "replies"}
              </span>
            </div>
          </header>
          <div className="p-5">
            <div className="prose-body whitespace-pre-line break-words text-sm leading-relaxed text-body">
              {discussion.body.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {discussion.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1">
                {discussion.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <DiscussionActions discussionId={discussion.id} initialVoteScore={discussion.voteScore} initialState={viewerState} viewerStatus={viewerStatus} isAuthor={isAuthor} />
              <div className="flex items-center gap-2">
                <ShareButton
                  url={siteUrl(`/community/${discussion.slug}`)}
                  title={discussion.title}
                  text={excerpt(discussion.body, 140)}
                  contentType="discussion"
                  contentId={discussion.id}
                />
                {!isAuthor && <ReportButton targetType="discussion" targetId={discussion.id} viewerStatus={viewerStatus} />}
              </div>
            </div>
          </div>
        </article>

        <section aria-labelledby="replies-heading" className="rounded-md border border-line bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
            <h2 id="replies-heading" className="text-sm font-semibold text-ink">
              Replies <span className="font-mono text-muted">({comments.length})</span>
            </h2>
            <p className="text-2xs text-muted">Replies are community interpretation, not regulatory fact.</p>
          </header>
          <div className="p-5">
            {comments.length === 0 ? (
              <EmptyState icon="message" title="No replies yet" description="Share how your firm approaches this — practitioners value concrete, sourced answers." className="py-6" />
            ) : (
              <CommentThread
                comments={comments}
                discussionId={discussion.id}
                viewer={{ status: viewerStatus, userId, displayName: session?.profile.displayName ?? null, isDiscussionAuthor: isAuthor }}
              />
            )}
            <div className="mt-6 border-t border-line pt-5">
              <ReplyComposer discussionId={discussion.id} viewerStatus={viewerStatus} displayName={session?.profile.displayName ?? null} />
            </div>
          </div>
        </section>
      </div>

      <aside className="min-w-0 space-y-6">
        {author && (
          <Panel title="Asked by" icon="user">
            <div className="flex items-start gap-3">
              <Avatar initials={author.initials} size="md" verified={author.verifiedPractitioner} />
              <div className="min-w-0">
                <Link href={`/members/${author.handle}`} className="text-sm font-semibold text-ink hover:text-accent">
                  {author.displayName}
                </Link>
                <p className="text-2xs text-muted">
                  {author.jobTitle} · {author.yearsExperience} yrs
                </p>
              </div>
            </div>
            {!isAuthor && (
              <div className="mt-3">
                <FollowButton targetType="user" targetId={author.userId} initialFollowing={followingAuthor} viewerStatus={viewerStatus} label="Follow expert" />
              </div>
            )}
          </Panel>
        )}
        <Panel title="Research with RegBot" icon="bot">
          <p className="text-xs text-body">See what trusted sources say before relying on member interpretation.</p>
          <AskRegBotButton question={discussion.title} className="mt-3">
            Ask RegBot this question
          </AskRegBotButton>
        </Panel>
        {article && (
          <Panel title="Knowledge Base" icon="book">
            <Link href={`/knowledge/${article.slug}`} className="text-sm font-semibold text-ink hover:text-accent">
              {article.title}
            </Link>
            <p className="mt-1 line-clamp-3 text-xs text-muted">{article.summary}</p>
          </Panel>
        )}
        {similar.length > 0 && (
          <Panel title="Similar discussions" icon="message" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {similar.map((d) => (
                <DiscussionRow key={d.id} discussion={d} variant="compact" />
              ))}
            </ul>
          </Panel>
        )}
      </aside>
    </div>
  );
}
