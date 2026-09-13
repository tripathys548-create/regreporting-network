"use client";

import { useCallback } from "react";
import { toDateKey } from "@/lib/format";
import type { ChallengeAttempt } from "@/types";
import { useLocalStorageState } from "./useLocalStorageState";

interface ProgressState {
  attempts: Record<string, ChallengeAttempt>;
  score: number;
  streakDays: number;
  lastDailyDate: string | null;
}

const INITIAL: ProgressState = { attempts: {}, score: 0, streakDays: 0, lastDailyDate: null };
export const POINTS_PER_CORRECT = 10;
export const DAILY_BONUS = 15;

function previousDateKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return toDateKey(d);
}

/** Phase 1: stored per browser. Phase 5 moves scoring and streaks server-side. */
export function useChallengeProgress() {
  const [state, setState, loaded] = useLocalStorageState<ProgressState>("rrn:challenge-progress", INITIAL);

  const record = useCallback(
    (questionId: string, selectedOptionId: string, correct: boolean, isDaily = false) => {
      setState((prev) => {
        if (prev.attempts[questionId] && !isDaily) return prev; // first attempt counts
        const today = toDateKey(new Date());
        const alreadyDidDaily = isDaily && prev.lastDailyDate === today;
        let { streakDays, lastDailyDate, score } = prev;

        if (isDaily && !alreadyDidDaily) {
          streakDays = prev.lastDailyDate === previousDateKey(today) ? prev.streakDays + 1 : 1;
          lastDailyDate = today;
          if (correct) score += DAILY_BONUS;
        }
        if (!prev.attempts[questionId] && correct) score += POINTS_PER_CORRECT;

        return {
          attempts: { ...prev.attempts, [questionId]: prev.attempts[questionId] ?? { questionId, selectedOptionId, correct, answeredAt: new Date().toISOString() } },
          score,
          streakDays,
          lastDailyDate,
        };
      });
    },
    [setState],
  );

  const reset = useCallback(() => setState(INITIAL), [setState]);
  const dailyDoneToday = state.lastDailyDate === toDateKey(new Date());

  return { ...state, loaded, record, reset, dailyDoneToday };
}
