import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { DemoContentLabel, SourceTypeLabel } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { TopicBadge } from "@/components/ui/Badge";
import { SOURCES } from "@/data/sources";
import { TOPICS } from "@/data/topics";
import { formatDate } from "@/lib/format";
import type { SearchParams } from "@/lib/params";
import { DEMO_SECTIONS_ENABLED } from "@/lib/features";
import { parseSearchFilters, searchContent } from "@/lib/search/search";
import type { SearchContentType, SearchFilters } from "@/types";

export const metadata: Metadata = { title: "Search" };

const TYPE_LABEL: Record<SearchContentType, string> = {
  update: "Regulatory Updates",
  discussion: "Community Discussions",
  article: "Knowledge Articles",
  document: "Official Documents",
};

// Articles and documents are sample content, so their tabs are hidden with the demo sections.
const VISIBLE_TYPES = (Object.keys(TYPE_LABEL) as SearchContentType[]).filter((t) => DEMO_SECTIONS_ENABLED || (t !== "article" && t !== "document"));

const EXAMPLES = ["UTI lifecycle", "validation rejects", "delegated reporting", "LEI lapsed", "ISO 20022"];

function hrefWith(filters: SearchFilters, patch: Partial<SearchFilters>) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  (Object.entries(next) as [keyof SearchFilters, string][]).forEach(([k, v]) => {
    if (v && v !== "all" && v !== "any") params.set(k, v);
  });
  return `/search?${params.toString()}`;
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label htmlFor={`f-${name}`} className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={value} className="field-input py-1.5 text-xs">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseSearchFilters(searchParams);
  const response = await searchContent(filters);
  const hasQuery = filters.q.trim().length > 0;
  const totalAcrossTypes = Object.values(response.counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        eyebrow="Global search"
        title="Search"
        description={DEMO_SECTIONS_ENABLED ? "Search regulatory updates, community discussions, Knowledge Base articles and official source documents." : "Search published regulatory updates and community discussions."}
      />

      <form role="search" action="/search" method="get" className="rounded-md border border-line bg-surface p-4">
        {filters.type !== "all" && <input type="hidden" name="type" value={filters.type} />}
        <label htmlFor="search-q" className="sr-only">
          Search query
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input id="search-q" name="q" defaultValue={filters.q} placeholder="e.g. UTI lifecycle" autoFocus={!hasQuery} className="field-input pl-9" />
          </div>
          <button type="submit" className="rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong">
            Search
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Select name="source" label="Source" value={filters.source} options={[{ value: "all", label: "All sources" }, ...SOURCES.map((s) => ({ value: s.shortName, label: s.shortName })), { value: "Community", label: "Community" }, ...(DEMO_SECTIONS_ENABLED ? [{ value: "Knowledge Base", label: "Knowledge Base" }] : [])]} />
          <Select name="jurisdiction" label="Jurisdiction" value={filters.jurisdiction} options={[{ value: "all", label: "All" }, ...["EU", "UK", "US", "Global"].map((j) => ({ value: j, label: j }))]} />
          <Select name="topic" label="Topic" value={filters.topic} options={[{ value: "all", label: "All topics" }, ...TOPICS.map((t) => ({ value: t.slug, label: t.label }))]} />
          <Select name="date" label="Date" value={filters.date} options={[{ value: "any", label: "Any time" }, { value: "30d", label: "Past 30 days" }, { value: "90d", label: "Past 90 days" }, { value: "365d", label: "Past year" }]} />
        </div>
      </form>

      {!hasQuery ? (
        <div className="mt-6 rounded-md border border-line bg-surface">
          <EmptyState
            icon="search"
            title="Search across the platform"
            description="Try one of these practitioner searches:"
            action={
              <div className="flex flex-wrap justify-center gap-1.5">
                {EXAMPLES.map((ex) => (
                  <Link key={ex} href={`/search?q=${encodeURIComponent(ex)}`} className="rounded-md border border-line px-2.5 py-1 text-xs text-body hover:border-accent/40 hover:text-accent">
                    {ex}
                  </Link>
                ))}
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_1fr]">
          <nav aria-label="Content type" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
            <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible">
              <li>
                <Link href={hrefWith(filters, { type: "all" })} className={clsx("flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-xs font-medium", filters.type === "all" ? "bg-navy text-white" : "text-body hover:bg-surface")}>
                  All results <span className="font-mono">{totalAcrossTypes}</span>
                </Link>
              </li>
              {VISIBLE_TYPES.map((t) => (
                <li key={t}>
                  <Link href={hrefWith(filters, { type: t })} className={clsx("flex shrink-0 items-center justify-between gap-3 rounded-md px-3 py-2 text-xs font-medium", filters.type === t ? "bg-navy text-white" : "text-body hover:bg-surface")}>
                    {TYPE_LABEL[t]} <span className="font-mono">{response.counts[t]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <section aria-live="polite" aria-label="Search results" className="min-w-0">
            <p className="mb-3 text-xs text-muted">
              {response.total} {response.total === 1 ? "result" : "results"} for <span className="font-semibold text-ink">&ldquo;{filters.q}&rdquo;</span>
            </p>
            {response.results.length === 0 ? (
              <div className="rounded-md border border-line bg-surface">
                <EmptyState
                  icon="search"
                  title="No results"
                  description="Try fewer words, remove filters, or ask RegBot to research the question."
                  action={
                    <div className="flex gap-2">
                      <ButtonLink href={`/search?q=${encodeURIComponent(filters.q)}`} size="sm">
                        Clear filters
                      </ButtonLink>
                      <AskRegBotButton question={filters.q} variant="primary" />
                    </div>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-line rounded-md border border-line bg-surface">
                {response.results.map((r) => {
                  const external = r.contentType === "document";
                  return (
                    <li key={`${r.contentType}-${r.id}`} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-2xs font-semibold uppercase tracking-wider text-muted">{TYPE_LABEL[r.contentType]}</span>
                        <span className="text-2xs text-muted">·</span>
                        <span className="text-2xs font-medium text-body">{r.sourceLabel}</span>
                        <SourceTypeLabel type={r.sourceType} size="xs" />
                        {r.topics.slice(0, 2).map((t) => (
                          <TopicBadge key={t} topic={t} />
                        ))}
                        {r.isDemo && <DemoContentLabel compact />}
                      </div>
                      {external ? (
                        <a href={r.href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-accent">
                          {r.title}
                          <Icon name="external" className="h-3 w-3 text-muted" />
                        </a>
                      ) : (
                        <Link href={r.href} className="mt-1 block text-sm font-semibold text-ink hover:text-accent">
                          {r.title}
                        </Link>
                      )}
                      <p className="mt-0.5 line-clamp-2 text-xs text-body">{r.excerpt}</p>
                      <p className="mt-1 font-mono text-2xs text-muted">{formatDate(r.date)}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
