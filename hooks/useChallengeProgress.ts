"use client";

import { useCallback } from "react";
import type { ChallengeAttempt } from "@/types";
import { useLocalStorageState } from "./useLocalStorageState";

interface ProgressState {
  attempts: Record<string, ChallengeAttempt>;
  score: number;
}

const INITIAL: ProgressState = { attempts: {}, score: 0 };
export const POINTS_PER_CORRECT = 10;

/** Progress on the challenge sets (Spot the Rejection, Regulatory Quiz, Fix the Report). Phase 1: stored per browser. */
export function useChallengeProgress() {
  const [state, setState, loaded] = useLocalStorageState<ProgressState>("rrn:challenge-progress", INITIAL);

  const record = useCallback(
    (questionId: string, selectedOptionId: string, correct: boolean) => {
      setState((prev) => {
        if (prev.attempts[questionId]) return prev; // first attempt counts
        const score = correct ? prev.score + POINTS_PER_CORRECT : prev.score;
        return {
          attempts: { ...prev.attempts, [questionId]: { questionId, selectedOptionId, correct, answeredAt: new Date().toISOString() } },
          score,
        };
      });
    },
    [setState],
  );

  const reset = useCallback(() => setState(INITIAL), [setState]);

  return { ...state, loaded, record, reset };
}
