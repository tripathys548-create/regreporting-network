"use client";

import { useChallengeProgress, DAILY_BONUS, POINTS_PER_CORRECT } from "@/hooks/useChallengeProgress";
import type { ChallengeQuestion, LeaderboardEntry } from "@/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/States";
import { QuestionCard, type ResolvedReference } from "./QuestionCard";

function Stat({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5">
      <Icon name={icon} className="text-muted" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="font-mono text-base font-semibold leading-tight text-ink">{value}</p>
      </div>
    </div>
  );
}

/** Rank against the published leaderboard, inserting the member's local score. */
function computeRank(score: number, leaderboard: LeaderboardEntry[]): number {
  return leaderboard.filter((e) => e.score > score).length + 1;
}

export function ChallengeStats({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const progress = useChallengeProgress();
  if (!progress.loaded) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[58px]" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat icon="trophy" label="Score" value={String(progress.score)} />
      <Stat icon="flame" label="Streak" value={`${progress.streakDays}d`} />
      <Stat icon="layers" label="Rank" value={`#${computeRank(progress.score, leaderboard)}`} />
    </div>
  );
}

export function DailyChallenge({ question, references }: { question: ChallengeQuestion; references: ResolvedReference[] }) {
  const progress = useChallengeProgress();

  if (!progress.loaded) return <Skeleton className="h-64" />;

  const previous = progress.dailyDoneToday ? progress.attempts[question.id]?.selectedOptionId ?? null : null;

  return (
    <div>
      <p className="mb-3 text-2xs text-muted">
        {progress.dailyDoneToday
          ? "Completed today. A new question is published at 00:00 UTC."
          : `+${POINTS_PER_CORRECT} points for a correct answer, +${DAILY_BONUS} daily bonus, and your streak continues.`}
      </p>
      <QuestionCard
        key={`${question.id}-${previous ?? "new"}`}
        question={question}
        references={references}
        previousSelection={previous}
        onAnswered={(selected, correct) => progress.record(question.id, selected, correct, true)}
      />
    </div>
  );
}
