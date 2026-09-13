import clsx from "clsx";
import Link from "next/link";
import { formatCompact } from "@/lib/format";
import type { DiscussionView } from "@/types";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge, Tag, TopicBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { RelativeTime } from "@/components/ui/RelativeTime";

function Metric({ value, label, highlight }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className={clsx("flex w-12 flex-col items-center rounded border px-1 py-1", highlight ? "border-good/30 bg-good-soft text-good" : "border-transparent text-body")}>
      <span className="font-mono text-sm font-semibold leading-none">{formatCompact(value)}</span>
      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

export function DiscussionRow({ discussion, variant = "full" }: { discussion: DiscussionView; variant?: "full" | "compact" }) {
  const { author, experts } = discussion;
  const href = `/community/${discussion.slug}`;
  const answered = discussion.acceptedCommentId !== null;

  if (variant === "compact") {
    return (
      <li className="px-4 py-3 hover:bg-canvas/60">
        <div className="flex items-center gap-1.5">
          <TopicBadge topic={discussion.category} />
          {answered && <Badge tone="good">Answered</Badge>}
        </div>
        <Link href={href} className="mt-1 block text-[13px] font-semibold leading-snug text-ink hover:text-accent">
          {discussion.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="message" className="h-3 w-3" />
            {discussion.replyCount} {discussion.replyCount === 1 ? "reply" : "replies"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="eye" className="h-3 w-3" />
            {formatCompact(discussion.viewCount)} views
          </span>
          {experts.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <AvatarStack people={experts} />
              <span>{experts.length === 1 ? "1 expert" : `${experts.length} experts`}</span>
            </span>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className="flex gap-3 px-4 py-3.5 hover:bg-canvas/60">
      <div className="hidden shrink-0 gap-1 sm:flex">
        <Metric value={discussion.voteScore} label="votes" />
        <Metric value={discussion.replyCount} label="replies" highlight={answered} />
        <Metric value={discussion.viewCount} label="views" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <TopicBadge topic={discussion.category} href={`/community?category=${discussion.category}`} />
          {answered && (
            <Badge tone="good">
              <Icon name="check" className="h-3 w-3" />
              Accepted answer
            </Badge>
          )}
          {discussion.origin === "regbot-escalation" && <Badge tone="accent">From RegBot</Badge>}
        </div>
        <h3 className="mt-1 text-sm font-semibold leading-snug text-ink">
          <Link href={href} className="hover:text-accent">
            {discussion.title}
          </Link>
        </h3>
        {discussion.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {discussion.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-muted">
          <span className="sm:hidden">
            {discussion.voteScore} votes · {discussion.replyCount} replies · {formatCompact(discussion.viewCount)} views
          </span>
          {author && (
            <span>
              Asked by{" "}
              <Link href={`/members/${author.handle}`} className="font-medium text-body hover:text-accent">
                {author.displayName}
              </Link>
            </span>
          )}
          <span>
            Active <RelativeTime iso={discussion.lastActivityAt} />
          </span>
          {experts.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <AvatarStack people={experts} />
              <span>experts participating</span>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
