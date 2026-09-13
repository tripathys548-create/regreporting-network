import clsx from "clsx";
import { SOURCE_TYPE_META, TIER_LABEL } from "@/lib/constants";
import type { SourceTier, SourceType } from "@/types";
import { Icon } from "./Icon";

/** Shows how authoritative a statement is. Required anywhere RegBot or KB content is shown. */
export function SourceTypeLabel({ type, size = "sm", className }: { type: SourceType; size?: "xs" | "sm"; className?: string }) {
  const meta = SOURCE_TYPE_META[type];
  return (
    <span
      title={meta.description}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded border font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-2xs" : "px-2 py-0.5 text-xs",
        meta.className,
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", meta.dotClassName)} aria-hidden />
      {meta.label}
    </span>
  );
}

/** Publisher name rendered as a terminal-style source tag, e.g. [ESMA]. */
export function SourceBadge({ name, tier, verified, className }: { name: string; tier?: SourceTier; verified?: boolean; className?: string }) {
  return (
    <span
      title={tier ? `${TIER_LABEL[tier]}${verified ? " · verified official domain" : ""}` : undefined}
      className={clsx("inline-flex items-center gap-1 rounded-sm bg-navy px-1.5 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wider text-white", className)}
    >
      {name}
      {verified && <Icon name="shieldCheck" className="h-3 w-3 text-emerald-300" title="Verified official source" />}
    </span>
  );
}

export function TierIndicator({ tier }: { tier: SourceTier }) {
  return (
    <span className="inline-flex items-center gap-1 text-2xs text-muted" title={TIER_LABEL[tier]}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={clsx("h-2.5 w-1 rounded-sm", n <= 5 - tier ? "bg-ink/70" : "bg-line")} />
        ))}
      </span>
      Tier {tier}
    </span>
  );
}

export function DemoContentLabel({ className, compact }: { className?: string; compact?: boolean }) {
  const description = "Sample content for demonstration. It does not describe a real publication or requirement — verify against the official source.";
  if (compact) {
    return (
      <span title={description} className={clsx("inline-flex items-center gap-1 rounded border border-dashed border-signal/40 bg-signal-soft px-1.5 py-0.5 text-2xs font-medium text-signal", className)}>
        <Icon name="info" className="h-3 w-3" />
        Demo
      </span>
    );
  }
  // Full label is the legal disclaimer for a page or article, so it is sized to be read, not skimmed past.
  return (
    <p role="note" className={clsx("flex max-w-2xl items-start gap-2 rounded-md border border-signal/40 bg-signal-soft px-3 py-2 text-xs text-signal", className)}>
      <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-semibold">Example / Demo Content.</strong> Sample material for illustration only — it does not describe a real publication or requirement and is not legal or regulatory advice. Always verify against the official source.
      </span>
    </p>
  );
}
