"use client";

import { useCallback, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { RegBotAnswer } from "@/types";

export interface RegBotTurn {
  id: string;
  question: string;
  status: "pending" | "done" | "error";
  answer: RegBotAnswer | null;
  error: string | null;
}

export const REGBOT_MAX_QUESTION_LENGTH = 600;

export function useRegBot() {
  const [turns, setTurns] = useState<RegBotTurn[]>([]);
  const sessionId = useRef<string | null>(null);
  const isBusy = turns.some((t) => t.status === "pending");

  const ask = useCallback(
    async (rawQuestion: string) => {
      const question = rawQuestion.trim();
      if (!question || isBusy) return;
      const id = `t-${Date.now()}`;
      setTurns((prev) => [...prev, { id, question, status: "pending", answer: null, error: null }]);

      try {
        const res = await api.askRegBot(question, sessionId.current);
        if (!res.ok) throw new ApiError(res.error, 200);
        sessionId.current = res.sessionId;
        setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "done", answer: res.answer } : t)));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, status: "error", error: message } : t)));
      }
    },
    [isBusy],
  );

  const retry = useCallback(
    (turnId: string) => {
      const turn = turns.find((t) => t.id === turnId);
      if (!turn) return;
      setTurns((prev) => prev.filter((t) => t.id !== turnId));
      void ask(turn.question);
    },
    [turns, ask],
  );

  const reset = useCallback(() => {
    sessionId.current = null;
    setTurns([]);
  }, []);

  return { turns, ask, retry, reset, isBusy };
}
