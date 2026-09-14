"use client";

import { useCallback, useMemo } from "react";
import { DAILY_QUESTION_BANK } from "@/data/dailyQuestionBank";
import { buildDailySet, recentQuestionIds } from "@/lib/dailyChallenge/engine";
import { toDateKey } from "@/lib/format";
import type { DailyDifficulty, DailyProgressState, DailyQuestion, DailyQuestionResult, DailySetRecord } from "@/types";
import { useLocalStorageState } from "./useLocalStorageState";

const INITIAL: DailyProgressState = { history: {}, streakDays: 0, lastCompletedDate: null };

export const XP_PER_CORRECT = 100;
export const MAX_BASE_XP = 500;
const SPEED_BONUS_FAST_MS = 15_000;
const SPEED_BONUS_OK_MS = 25_000;

function previousDateKey(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return toDateKey(d);
}

function speedBonusFor(timeMs: number, correct: boolean): number {
  if (!correct) return 0;
  if (timeMs < SPEED_BONUS_FAST_MS) return 10;
  if (timeMs < SPEED_BONUS_OK_MS) return 5;
  return 0;
}

function streakBonusFor(streakDays: number): number {
  if (streakDays >= 30) return 50;
  if (streakDays >= 14) return 30;
  if (streakDays >= 7) return 20;
  if (streakDays >= 3) return 10;
  return 0;
}

function lifetimeAccuracy(state: DailyProgressState): number | null {
  let correct = 0;
  let total = 0;
  for (const record of Object.values(state.history)) {
    for (const result of Object.values(record.results)) {
      total += 1;
      if (result.correct) correct += 1;
    }
  }
  return total >= 5 ? correct / total : null;
}

export function useDailyChallenge() {
  const [state, setState, loaded] = useLocalStorageState<DailyProgressState>("rrn:daily-challenge", INITIAL);
  const dateKey = toDateKey(new Date());

  const questions = useMemo<DailyQuestion[]>(() => {
    if (!loaded) return [];
    const existing = state.history[dateKey];
    if (existing) {
      return existing.questionIds.map((id) => DAILY_QUESTION_BANK.find((q) => q.id === id)).filter((q): q is DailyQuestion => Boolean(q));
    }
    const historyDates = Object.keys(state.history);
    const questionIdsByDate = Object.fromEntries(historyDates.map((d) => [d, state.history[d].questionIds]));
    const recent = recentQuestionIds(historyDates, questionIdsByDate);
    const accuracy = lifetimeAccuracy(state);
    return buildDailySet(dateKey, accuracy, recent);
  }, [loaded, state, dateKey]);

  // Persist a freshly generated set immediately so a reload doesn't risk recomputing differently.
  const ensureRecord = useCallback((): DailySetRecord => {
    const existing = state.history[dateKey];
    if (existing) return existing;
    const record: DailySetRecord = {
      dateKey,
      questionIds: questions.map((q) => q.id),
      results: {},
      completedAt: null,
      baseXp: 0,
      speedBonus: 0,
      streakBonus: 0,
    };
    setState((prev) => (prev.history[dateKey] ? prev : { ...prev, history: { ...prev.history, [dateKey]: record } }));
    return record;
  }, [state, dateKey, questions, setState]);

  const record = state.history[dateKey] ?? null;
  const answeredCount = record ? Object.keys(record.results).length : 0;
  const isComplete = record?.completedAt != null;

  const submitAnswer = useCallback(
    (question: DailyQuestion, selectedIndex: number, timeMs: number) => {
      setState((prev) => {
        const current = prev.history[dateKey] ?? {
          dateKey,
          questionIds: questions.map((q) => q.id),
          results: {},
          completedAt: null,
          baseXp: 0,
          speedBonus: 0,
          streakBonus: 0,
        };
        if (current.results[question.id]) return prev; // already scored — no duplicate scoring on resubmit/refresh

        const correct = selectedIndex === question.correctIndex;
        const result: DailyQuestionResult = { questionId: question.id, category: question.category, selectedIndex, correct, answeredAt: new Date().toISOString(), timeMs };
        const results = { ...current.results, [question.id]: result };
        const baseXp = current.baseXp + (correct ? XP_PER_CORRECT : 0);
        const speedBonus = current.speedBonus + speedBonusFor(timeMs, correct);

        const justCompleted = Object.keys(results).length === current.questionIds.length;
        let { streakDays, lastCompletedDate } = prev;
        let streakBonus = current.streakBonus;
        let completedAt = current.completedAt;

        if (justCompleted && !current.completedAt) {
          streakDays = prev.lastCompletedDate === previousDateKey(dateKey) ? prev.streakDays + 1 : 1;
          lastCompletedDate = dateKey;
          streakBonus = streakBonusFor(streakDays);
          completedAt = new Date().toISOString();
        }

        const updatedRecord: DailySetRecord = { ...current, results, baseXp, speedBonus, streakBonus, completedAt };
        return { ...prev, history: { ...prev.history, [dateKey]: updatedRecord }, streakDays, lastCompletedDate };
      });
    },
    [setState, dateKey, questions],
  );

  const totalXpToday = record ? Math.min(record.baseXp, MAX_BASE_XP) + record.speedBonus + record.streakBonus : 0;
  const correctCountToday = record ? Object.values(record.results).filter((r) => r.correct).length : 0;

  return {
    loaded,
    dateKey,
    questions,
    record,
    answeredCount,
    isComplete,
    streakDays: state.streakDays,
    totalXpToday,
    correctCountToday,
    ensureRecord,
    submitAnswer,
  };
}

export type { DailyDifficulty };
