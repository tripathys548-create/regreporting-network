import clsx from "clsx";
import { daysUntil, formatCountdown, MONTHS_SHORT } from "@/lib/format";
import { getSourceSync } from "@/lib/repositories/sources";
import type { MilestoneType, RegulatoryMilestone } from "@/types";
import { Badge, TopicBadge, type BadgeTone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { DemoContentLabel, SourceBadge } from "@/components/ui/SourceLabels";

const TYPE_META: Record<MilestoneType, { label: string; tone: BadgeTone }> = {
  guidance: { label: "Guidance", tone: "accent" },
  "consultation-close": { label: "Consultation closes", tone: "neutral" },
  "industry-testing": { label: "Industry testing", tone: "neutral" },
  "go-live": { label: "Go-live", tone: "signal" },
  deadline: { label: "Deadline", tone: "bad" },
};

const monthYearFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

function Countdown({ iso }: { iso: string }) {
  const days = daysUntil(iso);
  return (
    <span
      suppressHydrationWarning
      className={clsx(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-2xs font-semibold",
        days < 0 ? "bg-canvas text-muted" : days <= 30 ? "bg-signal-soft text-signal" : "bg-canvas text-body",
      )}
    >
      <Icon name="clock" className="h-3 w-3" />
      {formatCountdown(iso)}
    </span>
  );
}

export function MilestoneList({ milestones, compact }: { milestones: RegulatoryMilestone[]; compact?: boolean }) {
  if (compact) {
    return (
      <ol className="divide-y divide-line">
        {milestones.map((m) => {
          const date = new Date(m.date);
          return (
            <li key={m.id} className="flex items-start gap-3 px-4 py-2.5">
              <div className="w-10 shrink-0 text-center">
                <p className="font-mono text-base font-semibold leading-none text-ink">{date.getUTCDate()}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted">{MONTHS_SHORT[date.getUTCMonth()]}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{m.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone="outline">{m.jurisdiction}</Badge>
                  <TopicBadge topic={m.regulation} />
                  <Countdown iso={m.date} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  const groups = new Map<string, RegulatoryMilestone[]>();
  for (const m of milestones) {
    const key = monthYearFormatter.format(new Date(m.date));
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <div className="space-y-8">
      {Array.from(groups.entries()).map(([month, items]) => (
        <section key={month} aria-label={month}>
          <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-widest text-muted">{month}</h2>
          <ol className="relative space-y-3 border-l border-line pl-6">
            {items.map((m) => {
              const source = getSourceSync(m.sourceId);
              const date = new Date(m.date);
              const meta = TYPE_META[m.milestoneType];
              return (
                <li key={m.id} className="relative">
                  <span className={clsx("absolute -left-[29px] top-4 h-2.5 w-2.5 rounded-full border-2 border-canvas", meta.tone === "bad" ? "bg-bad" : meta.tone === "signal" ? "bg-signal" : "bg-accent")} aria-hidden />
                  <article className="grid gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-[4.5rem_1fr_auto]">
                    <div className="flex items-baseline gap-2 sm:block sm:text-center">
                      <p className="font-mono text-2xl font-semibold leading-none text-ink">{date.getUTCDate()}</p>
                      <p className="text-2xs uppercase tracking-wide text-muted">{MONTHS_SHORT[date.getUTCMonth()]} {date.getUTCFullYear()}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <Badge tone="outline">{m.jurisdiction}</Badge>
                        <TopicBadge topic={m.regulation} />
                        {m.isDemo && <DemoContentLabel compact />}
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold text-ink">{m.title}</h3>
                      <p className="mt-1 text-sm text-body">
                        <span className="text-2xs font-semibold uppercase tracking-wide text-muted">Requirement · </span>
                        {m.requirement}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <SourceBadge name={source.shortName} tier={source.tier} verified={source.verifiedDomain} />
                        <a href={m.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-accent hover:text-accent-strong">
                          Official source
                          <Icon name="external" className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <Countdown iso={m.date} />
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
