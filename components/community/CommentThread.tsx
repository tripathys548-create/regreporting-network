import clsx from "clsx";
import Link from "next/link";
import type { CommentView, ViewerStatus } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { CommentActions } from "./CommentActions";

export interface ThreadViewer {
  status: ViewerStatus;
  userId: string | null;
  displayName: string | null;
  isDiscussionAuthor: boolean;
}

function CommentItem({ comment, replies, discussionId, viewer }: { comment: CommentView; replies: CommentView[]; discussionId: string; viewer: ThreadViewer }) {
  const author = comment.author;
  return (
    <li id={comment.id} className={clsx("scroll-mt-24", comment.isAccepted && "-mx-3 rounded-md border border-good/30 bg-good-soft/40 p-3")}>
      <div className="flex gap-3">
        <Avatar initials={author?.initials ?? "?"} size="md" verified={author?.verifiedPractitioner} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {author ? (
              <Link href={`/members/${author.handle}`} className="text-sm font-semibold text-ink hover:text-accent">
                {author.displayName}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-muted">Former member</span>
            )}
            {author?.verifiedPractitioner && (
              <Badge tone="accent" title="Verified practitioner">
                <Icon name="shieldCheck" className="h-3 w-3" />
                Verified
              </Badge>
            )}
            {author && (
              <span className="text-2xs text-muted">
                {author.jobTitle} · {author.yearsExperience} yrs
              </span>
            )}
            <span className="text-2xs text-muted">
              · <RelativeTime iso={comment.createdAt} />
            </span>
          </div>
          {comment.isAccepted && (
            <p className="mt-1 inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-good">
              <Icon name="check" className="h-3 w-3" />
              Accepted answer
            </p>
          )}
          <div className="prose-body mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-body">
            {comment.body.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {comment.knowledgeBaseCandidate && (
            <Badge tone="neutral" className="mt-2" title="Moderators have proposed this answer for the Knowledge Base">
              <Icon name="book" className="h-3 w-3" />
              Knowledge Base candidate
            </Badge>
          )}
          <CommentActions
            commentId={comment.id}
            discussionId={discussionId}
            voteScore={comment.voteScore}
            viewerUpvoted={comment.viewerUpvoted}
            isOwn={viewer.userId === comment.authorId}
            isAccepted={comment.isAccepted}
            canAccept={viewer.isDiscussionAuthor && comment.parentId === null}
            viewerStatus={viewer.status}
            displayName={viewer.displayName}
          />
          {replies.length > 0 && (
            <ul className="mt-4 space-y-4 border-l-2 border-line pl-4">
              {replies.map((r) => (
                <CommentItem key={r.id} comment={r} replies={[]} discussionId={discussionId} viewer={viewer} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}

export function CommentThread({ comments, discussionId, viewer }: { comments: CommentView[]; discussionId: string; viewer: ThreadViewer }) {
  const roots = comments
    .filter((c) => c.parentId === null)
    // Accepted answer first, then by votes, then oldest first.
    .sort((a, b) => Number(b.isAccepted) - Number(a.isAccepted) || b.voteScore - a.voteScore || a.createdAt.localeCompare(b.createdAt));

  return (
    <ul className="space-y-5">
      {roots.map((c) => (
        <CommentItem key={c.id} comment={c} replies={comments.filter((r) => r.parentId === c.id)} discussionId={discussionId} viewer={viewer} />
      ))}
    </ul>
  );
}
