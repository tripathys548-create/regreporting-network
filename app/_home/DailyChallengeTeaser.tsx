"use client";

import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function DailyChallengeTeaser() {
  const { loaded, streakDays, isComplete, correctCountToday, questions } = useDailyChallenge();

  return (
    <div className="flex h-full flex-col">
      <p className="font-mono text-2xs uppercase tracking-widest text-muted">🔥 Daily Reg Challenge</p>
      <p className="mt-1 text-sm font-medium text-ink">Test yourself across today's regulatory reporting scenarios.</p>
      <p className="mt-1 text-xs text-muted">5 Questions · EMIR · CFTC · MAS + 2 rotating topics · 90–120 sec</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-body" aria-live="polite">
        <span className="inline-flex items-center gap-1">
          <Icon name="flame" className="h-3.5 w-3.5 text-signal" />
          <span className="font-mono">{loaded ? streakDays : "–"}</span> day streak
        </span>
        {loaded && isComplete && (
          <span className="inline-flex items-center gap-1">
            <Icon name="trophy" className="h-3.5 w-3.5 text-muted" />
            <span className="font-mono">
              {correctCountToday}/{questions.length}
            </span>{" "}
            today
          </span>
        )}
      </div>
      <div className="mt-auto pt-4">
        <ButtonLink href="/challenges#daily" size="sm" variant={isComplete ? "secondary" : "primary"} iconRight="arrowRight">
          {isComplete ? "Review today's answers" : "Start today's challenge"}
        </ButtonLink>
      </div>
    </div>
  );
}
