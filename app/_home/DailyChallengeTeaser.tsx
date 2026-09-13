"use client";

import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function DailyChallengeTeaser({ prompt, hasScenario }: { prompt: string; hasScenario: boolean }) {
  const { streakDays, score, dailyDoneToday, loaded } = useChallengeProgress();
  return (
    <div className="flex h-full flex-col">
      <p className="font-mono text-2xs uppercase tracking-widest text-muted">{hasScenario ? "Scenario question" : "Quick question"}</p>
      <p className="mt-1 text-sm font-medium text-ink">{prompt}</p>
      <div className="mt-3 flex items-center gap-4 text-xs text-body" aria-live="polite">
        <span className="inline-flex items-center gap-1">
          <Icon name="flame" className="h-3.5 w-3.5 text-signal" />
          <span className="font-mono">{loaded ? streakDays : "–"}</span> day streak
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="trophy" className="h-3.5 w-3.5 text-muted" />
          <span className="font-mono">{loaded ? score : "–"}</span> pts
        </span>
      </div>
      <div className="mt-auto pt-4">
        <ButtonLink href="/challenges#daily" size="sm" variant={dailyDoneToday ? "secondary" : "primary"} iconRight="arrowRight">
          {dailyDoneToday ? "Review today's answer" : "Answer today's question"}
        </ButtonLink>
      </div>
    </div>
  );
}
