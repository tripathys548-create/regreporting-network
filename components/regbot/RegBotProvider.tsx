"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRegBot } from "@/hooks/useRegBot";
import { DEMO_SECTIONS_ENABLED } from "@/lib/features";
import { RegBotWidget } from "./RegBotWidget";

export interface OpenRegBotOptions {
  question?: string;
  /** Ask immediately (default) or only pre-fill the input. */
  autoSubmit?: boolean;
}

interface RegBotPanelContextValue {
  isOpen: boolean;
  open: (options?: OpenRegBotOptions) => void;
  close: () => void;
}

const RegBotPanelContext = createContext<RegBotPanelContextValue | null>(null);

/**
 * Hosts the RegBot popup for the whole app. Mounted in the root layout, so the
 * conversation survives client-side navigation between pages.
 */
export function RegBotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<OpenRegBotOptions | null>(null);
  const { turns, ask, retry, reset, isBusy } = useRegBot();

  const open = useCallback((options: OpenRegBotOptions = {}) => {
    setIsOpen(true);
    if (options.question?.trim()) setPending(options);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen || !pending?.question) return;
    const question = pending.question.trim();
    if (pending.autoSubmit !== false && !isBusy) void ask(question);
    else setDraft(question);
    setPending(null);
  }, [isOpen, pending, isBusy, ask]);

  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <RegBotPanelContext.Provider value={value}>
      {children}
      {DEMO_SECTIONS_ENABLED && (
        <RegBotWidget
          isOpen={isOpen}
          onOpen={() => open()}
          onClose={close}
          turns={turns}
          isBusy={isBusy}
          onAsk={(q) => void ask(q)}
          onRetry={retry}
          onReset={reset}
          draft={draft}
          onDraftChange={setDraft}
        />
      )}
    </RegBotPanelContext.Provider>
  );
}

export function useRegBotPanel(): RegBotPanelContextValue {
  const ctx = useContext(RegBotPanelContext);
  if (!ctx) throw new Error("useRegBotPanel must be used inside RegBotProvider");
  return ctx;
}
