"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useRegBotPanel } from "./RegBotProvider";

/** Opens the RegBot popup, optionally asking (or pre-filling) a question. Usable from server-rendered pages. */
export function AskRegBotButton({
  question,
  autoSubmit = true,
  children = "Ask RegBot",
  variant,
  size = "sm",
  className,
}: {
  question?: string;
  autoSubmit?: boolean;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { open } = useRegBotPanel();
  return (
    <Button variant={variant} size={size} icon="bot" className={className} onClick={() => open({ question, autoSubmit })} aria-haspopup="dialog">
      {children}
    </Button>
  );
}

/** Compact "quick question" field for the homepage hero. */
export function RegBotQuickAsk() {
  const { open } = useRegBotPanel();
  const [question, setQuestion] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    open({ question, autoSubmit: true });
    setQuestion("");
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
      <label htmlFor="hero-regbot" className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-400">
        <Icon name="bot" className="h-3.5 w-3.5" />
        Quick question for RegBot
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="hero-regbot"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={600}
          placeholder="What happens when the UTI is missing on a lifecycle event?"
          className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-navy-2 px-3 text-xs text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
        />
        <button type="submit" className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-medium text-white hover:bg-accent-strong" aria-label="Ask RegBot">
          <Icon name="send" />
        </button>
      </div>
    </form>
  );
}

/** Supports links such as /?regbot=1&q=… (used by the legacy /regbot URL) by opening the popup. */
export function RegBotUrlOpener() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { open } = useRegBotPanel();

  useEffect(() => {
    if (!params.get("regbot")) return;
    const q = params.get("q") ?? undefined;
    open({ question: q, autoSubmit: Boolean(q) });
    const rest = new URLSearchParams(params.toString());
    rest.delete("regbot");
    rest.delete("q");
    router.replace(rest.toString() ? `${pathname}?${rest.toString()}` : pathname, { scroll: false });
  }, [params, router, pathname, open]);

  return null;
}
