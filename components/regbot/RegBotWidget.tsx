"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { REGBOT_MAX_QUESTION_LENGTH, type RegBotTurn } from "@/hooks/useRegBot";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { RegBotAnswerView } from "./RegBotAnswerView";

export const SUGGESTED_QUESTIONS = ["What is UTI?", "CFTC vs EMIR", "How many fields are reported under EMIR?", "How does regulatory reporting work?"];

const PIPELINE_STEPS = ["Classifying query", "Searching trusted sources", "Retrieving documents", "Extracting passages", "Generating answer", "Building citations", "Evaluating confidence"];

function PendingAnswer() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, PIPELINE_STEPS.length - 1)), 90);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="rounded-md border border-line bg-surface p-3" aria-live="polite" aria-busy="true">
      <p className="flex items-center gap-2 text-xs font-medium text-body">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
        {PIPELINE_STEPS[step]}…
      </p>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

function HeaderButton({ icon, label, onClick, className, disabled }: { icon: IconName; label: string; onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx("flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40", className)}
    >
      <Icon name={icon} />
    </button>
  );
}

interface RegBotWidgetProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  turns: RegBotTurn[];
  isBusy: boolean;
  onAsk: (question: string) => void;
  onRetry: (turnId: string) => void;
  onReset: () => void;
  draft: string;
  onDraftChange: (value: string) => void;
  /** True when answers come from the live AI model rather than the reference library. */
  live: boolean;
}

/** Floating launcher + non-modal chat panel. Full screen below the sm breakpoint. */
export function RegBotWidget({ isOpen, onOpen, onClose, turns, isBusy, onAsk, onRetry, onReset, draft, onDraftChange, live }: RegBotWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Focus management: into the input on open, back to the launcher on close.
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
    else if (wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);

  // Prevent the page behind the full-screen mobile panel from scrolling.
  useEffect(() => {
    if (!isOpen || window.matchMedia("(min-width: 640px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  function submit(text: string) {
    if (!text.trim() || isBusy) return;
    onAsk(text);
    onDraftChange("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(draft);
    }
  }

  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        type="button"
        onClick={onOpen}
        aria-controls="regbot-panel"
        aria-expanded={false}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-navy py-2 pl-2 pr-4 text-sm font-semibold text-white shadow-lg shadow-ink/25 ring-1 ring-white/10 transition-colors hover:bg-navy-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent">
          <Icon name="bot" />
        </span>
        Ask RegBot
        {turns.length > 0 && (
          <span className="rounded-full bg-white/15 px-1.5 font-mono text-2xs" aria-label={`${turns.length} questions in this session`}>
            {turns.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <section
      id="regbot-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="regbot-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className={clsx(
        "fixed inset-0 z-50 flex flex-col overflow-hidden bg-canvas shadow-2xl sm:inset-auto sm:bottom-4 sm:right-4 sm:rounded-lg sm:border sm:border-line",
        expanded ? "sm:h-[calc(100vh-2rem)] sm:w-[min(52rem,calc(100vw-2rem))]" : "sm:h-[min(44rem,calc(100vh-2rem))] sm:w-[27rem]",
      )}
    >
      <header className="flex items-center gap-2 bg-navy px-3 py-2 text-white">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent">
          <Icon name="bot" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="regbot-title" className="text-sm font-semibold leading-tight">
            RegBot
          </h2>
          <p className="truncate text-2xs text-slate-400">Your regulatory reporting research assistant</p>
        </div>
        {turns.length > 0 && <HeaderButton icon="refresh" label="Start a new session" onClick={onReset} disabled={isBusy} />}
        <HeaderButton icon={expanded ? "minimize" : "maximize"} label={expanded ? "Shrink panel" : "Expand panel"} onClick={() => setExpanded((v) => !v)} className="hidden sm:flex" />
        <HeaderButton icon="x" label="Close RegBot" onClick={onClose} />
      </header>
      {live ? (
        <p className="flex items-center gap-1.5 border-b border-line bg-surface px-3 py-1.5 text-2xs text-muted" role="note">
          <Icon name="info" className="h-3 w-3" />
          AI-generated answers without live source search. Not legal or regulatory advice; verify against the official source.
        </p>
      ) : (
        <p className="flex items-center gap-1.5 border-b border-line bg-surface px-3 py-1.5 text-2xs text-muted" role="note">
          <Icon name="info" className="h-3 w-3" />
          Prewritten reference answers, not live source search. Not legal or regulatory advice; verify against the official source.
        </p>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
        {turns.length === 0 ? (
          <div>
            <p className="text-sm font-semibold text-ink">Ask a regulatory reporting question</p>
            <p className="mt-0.5 text-xs text-muted">Answers show their sources, a confidence rating, and where sources or practitioners disagree.</p>
            <ul className="mt-3 grid gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => submit(q)}
                    className="flex w-full items-start gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left text-xs text-body hover:border-accent/40 hover:text-ink"
                  >
                    <Icon name="arrowRight" className="mt-0.5 h-3.5 w-3.5 text-accent" />
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="space-y-5" aria-label="Conversation">
            {turns.map((turn) => (
              <li key={turn.id} className="space-y-2.5">
                <div className="flex justify-end">
                  <p className="max-w-[88%] rounded-md bg-navy px-3 py-2 text-sm text-white">{turn.question}</p>
                </div>
                {turn.status === "pending" && <PendingAnswer />}
                {turn.status === "error" && (
                  <ErrorState
                    title="RegBot couldn't answer"
                    description={turn.error ?? undefined}
                    action={
                      <Button size="sm" icon="refresh" onClick={() => onRetry(turn.id)}>
                        Retry
                      </Button>
                    }
                  />
                )}
                {turn.status === "done" && turn.answer && <RegBotAnswerView answer={turn.answer} turnId={turn.id} onNavigate={() => setExpanded(false)} />}
              </li>
            ))}
          </ol>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line bg-surface p-2">
        <label htmlFor="regbot-question" className="sr-only">
          Ask RegBot a regulatory reporting question
        </label>
        <textarea
          id="regbot-question"
          ref={inputRef}
          rows={2}
          value={draft}
          maxLength={REGBOT_MAX_QUESTION_LENGTH}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about a field, event type, rejection or requirement…"
          className="block w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-2xs text-muted">Do not paste confidential trade data.</p>
          <Button type="submit" size="sm" variant="primary" icon="send" disabled={isBusy || !draft.trim()}>
            {isBusy ? "Researching…" : "Ask"}
          </Button>
        </div>
      </form>
    </section>
  );
}
