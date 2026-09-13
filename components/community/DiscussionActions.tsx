"use client";

import clsx from "clsx";
import { useState } from "react";
import { api, ApiError, goToSignIn } from "@/lib/api/client";
import type { ViewerState, ViewerStatus } from "@/types";
import { Icon, type IconName } from "@/components/ui/Icon";

type Action = "upvote" | "save" | "follow";

function ActionButton({ active, icon, label, activeLabel, onClick, count, busy, disabled, title }: { active: boolean; icon: IconName; label: string; activeLabel: string; onClick: () => void; count?: number; busy: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-busy={busy}
      disabled={disabled || busy}
      title={title}
      className={clsx(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60",
        active ? "border-accent/40 bg-accent-soft text-accent-strong" : "border-line bg-surface text-body hover:bg-canvas",
      )}
    >
      <Icon name={icon} className="h-3.5 w-3.5" />
      {active ? activeLabel : label}
      {count !== undefined && <span className="font-mono">{count}</span>}
    </button>
  );
}

/** Upvote / reply / save / follow for a discussion, persisted via the API. */
export function DiscussionActions({
  discussionId,
  initialVoteScore,
  initialState,
  viewerStatus,
  isAuthor,
}: {
  discussionId: string;
  initialVoteScore: number;
  initialState: ViewerState;
  viewerStatus: ViewerStatus;
  isAuthor: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [score, setScore] = useState(initialVoteScore);
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: Action) {
    if (viewerStatus === "signed-out") return goToSignIn();
    if (action === "upvote" && viewerStatus === "unverified") return setMessage("Verify your email address to vote.");
    setBusy(action);
    setMessage(null);
    try {
      if (action === "upvote") {
        const res = await api.toggleVote("discussion", discussionId);
        setState((s) => ({ ...s, upvoted: res.upvoted }));
        setScore(res.voteScore);
      } else if (action === "save") {
        const res = await api.toggleSave(discussionId);
        setState((s) => ({ ...s, saved: res.saved }));
      } else {
        const res = await api.toggleFollow("discussion", discussionId);
        setState((s) => ({ ...s, following: res.following }));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return goToSignIn();
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton
          active={state.upvoted}
          icon="arrowUp"
          label="Upvote"
          activeLabel="Upvoted"
          count={score}
          busy={busy === "upvote"}
          disabled={isAuthor}
          title={isAuthor ? "You cannot upvote your own discussion" : undefined}
          onClick={() => run("upvote")}
        />
        <a href="#reply" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-medium text-body hover:bg-canvas">
          <Icon name="message" className="h-3.5 w-3.5" />
          Reply
        </a>
        <ActionButton active={state.saved} icon="bookmark" label="Save" activeLabel="Saved" busy={busy === "save"} onClick={() => run("save")} />
        <ActionButton active={state.following} icon="bell" label="Follow" activeLabel="Following" busy={busy === "follow"} onClick={() => run("follow")} />
      </div>
      {message && (
        <p className="mt-2 text-xs text-bad" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
