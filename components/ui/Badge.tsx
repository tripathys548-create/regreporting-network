import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { topicLabel } from "@/data/topics";
import type { TopicSlug } from "@/types";

export type BadgeTone = "neutral" | "accent" | "signal" | "good" | "bad" | "outline";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-canvas text-body border-line",
  accent: "bg-accent-soft text-accent-strong border-accent/20",
  signal: "bg-signal-soft text-signal border-signal/25",
  good: "bg-good-soft text-good border-good/20",
  bad: "bg-bad-soft text-bad border-bad/20",
  outline: "bg-transparent text-muted border-line",
};

export function Badge({ tone = "neutral", children, className, title }: { tone?: BadgeTone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={clsx("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium leading-none", TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Category chip that links to the filtered community view. */
export function TopicBadge({ topic, href }: { topic: TopicSlug; href?: string }) {
  const classes = "inline-flex items-center rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-2xs font-medium uppercase tracking-wide text-body";
  if (!href) return <span className={classes}>{topicLabel(topic)}</span>;
  return (
    <Link href={href} className={clsx(classes, "hover:border-accent/40 hover:text-accent")}>
      {topicLabel(topic)}
    </Link>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-sm bg-canvas px-1.5 py-0.5 text-2xs text-muted">#{children}</span>;
}
