"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, goToSignIn } from "@/lib/api/client";
import type { ViewerStatus } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { ReplyComposer } from "./ReplyComposer";
import { ReportButton } from "./ReportButton";

interface CommentActionsProps {
  commentId: string;
  discussionId: string;
  voteScore: number;
  viewerUpvoted: boolean;
  isOwn: boolean;
  isAccepted: boolean;
  canAccept: boolean;
  viewerStatus: ViewerStatus;
  displayName: string | null;
}

export function CommentActions({ commentId, discussionId, voteScore, viewerUpvoted, isOwn, isAccepted, canAccept, viewerStatus, displayName }: CommentActionsProps) {
  const router = useRouter();
  const [score, setScore] = useState(voteScore);
  const [upvoted, setUpvoted] = useState(viewerUpvoted);
  const [replying, setReplying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function guarded(fn: () => Promise<void>) {
    if (viewerStatus === "signed-out") return goToSignIn();
    if (viewerStatus === "unverified") return setMessage("Verify your email address to do this.");
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return goToSignIn();
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const vote = () =>
    guarded(async () => {
      const res = await api.toggleVote("comment", commentId);
      setUpvoted(res.upvoted);
      setScore(res.voteScore);
    });

  const accept = () =>
    guarded(async () => {
      await api.toggleAccept(commentId);
      router.refresh();
    });

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-2xs text-muted">
      <button
        type="button"
        onClick={vote}
        disabled={busy || isOwn}
        aria-pressed={upvoted}
        title={isOwn ? "You cannot upvote your own reply" : "Upvote this reply"}
        className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono disabled:cursor-not-allowed", upvoted ? "bg-accent-soft text-accent-strong" : "hover:bg-canvas hover:text-ink")}
      >
        <Icon name="arrowUp" className="h-3 w-3" />
        {score}
        <span className="sr-only">upvotes</span>
      </button>
      <button type="button" onClick={() => (viewerStatus === "signed-out" ? goToSignIn() : setReplying((v) => !v))} className="inline-flex items-center gap-1 hover:text-ink">
        <Icon name="message" className="h-3 w-3" />
        Reply
      </button>
      {canAccept && (
        <button type="button" onClick={accept} disabled={busy} className={clsx("inline-flex items-center gap-1", isAccepted ? "text-good hover:text-ink" : "hover:text-good")}>
          <Icon name="check" className="h-3 w-3" />
          {isAccepted ? "Remove accepted answer" : "Accept answer"}
        </button>
      )}
      {!isOwn && <ReportButton targetType="comment" targetId={commentId} viewerStatus={viewerStatus} />}
      {message && (
        <p className="basis-full text-bad" role="alert">
          {message}
        </p>
      )}
      {replying && (
        <div className="basis-full">
          <ReplyComposer discussionId={discussionId} parentId={commentId} viewerStatus={viewerStatus} displayName={displayName} onDone={() => setReplying(false)} autoFocus />
        </div>
      )}
    </div>
  );
}
