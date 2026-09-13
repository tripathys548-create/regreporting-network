"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, goToSignIn } from "@/lib/api/client";
import { COMMENT_LIMITS } from "@/lib/validation";
import type { ViewerStatus } from "@/types";
import { Button } from "@/components/ui/Button";

interface ReplyComposerProps {
  discussionId: string;
  parentId?: string | null;
  viewerStatus: ViewerStatus;
  displayName: string | null;
  onDone?: () => void;
  autoFocus?: boolean;
}

export function ReplyComposer({ discussionId, parentId = null, viewerStatus, displayName, onDone, autoFocus }: ReplyComposerProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputId = parentId ? `reply-${parentId}` : "reply-body";

  if (viewerStatus === "signed-out") {
    return (
      <p className="rounded-md border border-dashed border-line bg-canvas px-4 py-3 text-sm text-body">
        <button type="button" onClick={goToSignIn} className="font-semibold text-accent hover:text-accent-strong">
          Sign in
        </button>{" "}
        or{" "}
        <Link href="/signup" className="font-semibold text-accent hover:text-accent-strong">
          create an account
        </Link>{" "}
        to reply.
      </p>
    );
  }

  if (viewerStatus === "unverified") {
    return (
      <p className="rounded-md border border-dashed border-signal/40 bg-signal-soft px-4 py-3 text-sm text-signal">
        <Link href="/verify-email" className="font-semibold underline">
          Verify your email address
        </Link>{" "}
        to reply.
      </p>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < COMMENT_LIMITS.min) {
      setError(`Replies need at least ${COMMENT_LIMITS.min} characters so they add something to the discussion.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createComment(discussionId, { body: text, parentId });
      setBody("");
      onDone?.();
      router.refresh();
      window.setTimeout(() => document.getElementById(res.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your reply.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={inputId} className="field-label">
        {parentId ? "Reply to this answer" : `Reply as ${displayName ?? "member"}`}
      </label>
      <textarea
        id={inputId}
        rows={parentId ? 3 : 4}
        autoFocus={autoFocus}
        value={body}
        maxLength={COMMENT_LIMITS.max}
        onChange={(e) => setBody(e.target.value)}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={`${inputId}-help`}
        className="field-input resize-y"
        placeholder="Share your experience. Cite the official source when you reference a requirement. Mention members with @handle."
      />
      {error ? (
        <p id={`${inputId}-help`} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        <p id={`${inputId}-help`} className="mt-1 text-2xs text-muted">
          Do not include client names, trade identifiers or other confidential data. Replies are shown as community interpretation.
        </p>
      )}
      <div className="mt-2 flex justify-end gap-2">
        {onDone && (
          <Button size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" icon="send" disabled={submitting}>
          {submitting ? "Posting…" : "Post reply"}
        </Button>
      </div>
    </form>
  );
}
