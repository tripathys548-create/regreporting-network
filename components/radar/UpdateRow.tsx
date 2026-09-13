import clsx from "clsx";
import Link from "next/link";
import type { RegulatorySource, RegulatoryUpdate } from "@/types";
import { Badge, TopicBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { DemoContentLabel, SourceBadge } from "@/components/ui/SourceLabels";
import { formatShortDate } from "@/lib/format";

export function UpdateRow({ update, source, compact }: { update: RegulatoryUpdate; source: RegulatorySource; compact?: boolean }) {
  return (
    <li className="group grid grid-cols-[3.5rem_1fr] gap-3 px-4 py-3 hover:bg-canvas/60 sm:grid-cols-[4.5rem_1fr_auto]">
      <time dateTime={update.publishedAt} className="pt-0.5 font-mono text-2xs uppercase text-muted">
        {formatShortDate(update.publishedAt)}
      </time>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge name={source.shortName} />
          <TopicBadge topic={update.category} />
          {update.severity !== "standard" && (
            <Badge tone={update.severity === "critical" ? "bad" : "signal"}>{update.severity === "critical" ? "Critical" : "High impact"}</Badge>
          )}
          {update.isDemo && <DemoContentLabel compact />}
        </div>
        <h3 className={clsx("mt-1 font-semibold leading-snug text-ink", compact ? "text-[13px]" : "text-sm")}>
          <Link href={`/radar/${update.id}`} className="hover:text-accent">
            {update.title}
          </Link>
        </h3>
        {!compact && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-body">{update.summary}</p>}
      </div>
      <a
        href={update.originalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="col-start-2 inline-flex items-center gap-1 self-start text-2xs font-medium text-accent hover:text-accent-strong sm:col-start-3"
      >
        Original source
        <Icon name="external" className="h-3 w-3" />
        <span className="sr-only">for {update.title} on the {source.shortName} website</span>
      </a>
    </li>
  );
}
