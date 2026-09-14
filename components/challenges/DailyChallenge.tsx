"use client";

import { useChallengeProgress } from "@/hooks/useChallengeProgress";
import { useDailyChallenge } from "@/hooks/useDailyChallenge";
import type { LeaderboardEntry } from "@/types";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/States";

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
  const daily = useDailyChallenge();
  if (!progress.loaded || !daily.loaded) {
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
      <Stat icon="flame" label="Streak" value={`${daily.streakDays}d`} />
      <Stat icon="layers" label="Rank" value={`#${computeRank(progress.score, leaderboard)}`} />
    </div>
  );
}
