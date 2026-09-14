import type { Metadata } from "next";
import Link from "next/link";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { TopicBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { DemoContentLabel, SourceBadge, SourceTypeLabel } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";
import { firstParam, type SearchParams } from "@/lib/params";
import { listArticles } from "@/lib/repositories/knowledge";
import { getSourceSync, listDocuments } from "@/lib/repositories/sources";
import { tokenize, termsMatch } from "@/lib/text";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function KnowledgeIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const q = (firstParam(searchParams, "q") ?? "").slice(0, 100);
  const [articles, documents] = await Promise.all([listArticles(), listDocuments()]);
  const queryTokens = tokenize(q);

  const filtered = queryTokens.length
    ? articles.filter((a) => {
        const haystack = tokenize(`${a.title} ${a.summary} ${a.sections.map((s) => `${s.heading} ${s.paragraphs.join(" ")}`).join(" ")}`);
        return queryTokens.every((t) => haystack.some((h) => termsMatch(h, t)));
      })
    : articles;

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Regulatory Knowledge Base"
        description="Topic guides for regulatory reporting, with every section citing and linking to the underlying regulatory documentation."
        meta={<DemoContentLabel />}
      />

      <form role="search" action="/knowledge" method="get" className="mb-5 flex max-w-xl gap-2">
        <label htmlFor="kb-search" className="sr-only">
          Search the Knowledge Base
        </label>
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input id="kb-search" name="q" defaultValue={q} placeholder="Search topics, e.g. lifecycle events, tolerances" className="field-input pl-9" />
        </div>
        <button type="submit" className="rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong">
          Search
        </button>
      </form>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-line bg-surface">
          <EmptyState
            icon="book"
            title={`No articles match “${q}”`}
            description="Try a broader term, or ask RegBot — it searches source documents as well as articles."
            action={
              <div className="flex gap-2">
                <ButtonLink href="/knowledge" size="sm">
                  Clear search
                </ButtonLink>
                <AskRegBotButton question={q} variant="primary" />
              </div>
            }
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {filtered.map((a) => {
            const citationCount = a.sections.reduce((n, s) => n + s.citations.length, 0);
            return (
              <li key={a.id}>
                <Link href={`/knowledge/${a.slug}`} className="group flex h-full flex-col rounded-md border border-line bg-surface p-4 hover:border-accent/40">
                  <div className="flex items-center justify-between">
                    <TopicBadge topic={a.topic} />
                    {a.isDemo && <DemoContentLabel compact />}
                  </div>
                  <h2 className="mt-2 text-sm font-semibold text-ink group-hover:text-accent">{a.title}</h2>
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-body">{a.summary}</p>
                  <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 font-mono text-2xs text-muted">
                    <span>{a.sections.length} sections</span>
                    <span>{citationCount} citations</span>
                    <span>Reviewed {formatDate(a.lastReviewedAt)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Panel title="Source document registry" icon="layers" className="mt-8" bodyClassName="p-0" headerRight={<span className="font-mono text-2xs text-muted">{documents.length} documents</span>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-xs">
            <thead className="border-b border-line bg-canvas/50 text-2xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Publisher</th>
                <th scope="col" className="px-4 py-2 font-semibold">Document</th>
                <th scope="col" className="px-4 py-2 font-semibold">Type</th>
                <th scope="col" className="px-4 py-2 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {documents.map((doc) => {
                const source = getSourceSync(doc.sourceId);
                return (
                  <tr key={doc.id} className="hover:bg-canvas/50">
                    <td className="px-4 py-2">
                      <SourceBadge name={source.shortName} tier={source.tier} />
                    </td>
                    <td className="px-4 py-2">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-ink hover:text-accent">
                        {doc.title}
                        <Icon name="external" className="h-3 w-3 text-muted" />
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      <SourceTypeLabel type={doc.sourceType} size="xs" />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-muted">{formatDate(doc.publishedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2 text-2xs text-muted">Always verify document titles and dates against the publisher&apos;s official website.</p>
      </Panel>

      <NewsletterCTA source="knowledge-base" className="mt-8" />
    </>
  );
}
