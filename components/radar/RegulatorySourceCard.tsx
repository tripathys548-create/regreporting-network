import Link from "next/link";
import type { RegulatorySource, RegulatoryUpdate } from "@/types";
import { TopicBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DemoContentLabel, SourceBadge, TierIndicator } from "@/components/ui/SourceLabels";
import { formatDate } from "@/lib/format";

export function RegulatorySourceCard({ source, update }: { source: RegulatorySource; update: RegulatoryUpdate | null }) {
  return (
    <article className="flex min-w-0 flex-col rounded-md border border-line bg-surface">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <SourceBadge name={source.shortName} tier={source.tier} verified={source.verifiedDomain} />
          <span className="truncate text-2xs text-muted" title={source.fullName}>
            {source.fullName}
          </span>
        </div>
        <TierIndicator tier={source.tier} />
      </header>

      {update ? (
        <div className="flex flex-1 flex-col px-4 py-3">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Latest update</p>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-ink">
            <Link href={`/radar/${update.id}`} className="hover:text-accent">
              {update.title}
            </Link>
          </h3>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted">Published</dt>
            <dd className="font-mono text-body">
              <time dateTime={update.publishedAt}>{formatDate(update.publishedAt)}</time>
            </dd>
            <dt className="text-muted">Category</dt>
            <dd>
              <TopicBadge topic={update.category} />
            </dd>
          </dl>
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-body">{update.summary}</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            {update.isDemo ? <DemoContentLabel compact /> : <span />}
            <ButtonLink href={update.originalUrl} external size="sm" iconRight="external">
              Read {source.shortName} Update
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-start justify-between gap-3 px-4 py-4">
          <p className="text-xs text-muted">No published updates from {source.shortName} yet.</p>
          <ButtonLink href={source.websiteUrl} external size="sm" iconRight="external">
            Visit {source.shortName}
          </ButtonLink>
        </div>
      )}
    </article>
  );
}
