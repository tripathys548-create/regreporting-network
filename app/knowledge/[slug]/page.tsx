import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscussionRow } from "@/components/community/DiscussionRow";
import { CitationList } from "@/components/knowledge/CitationList";
import { TopicBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { ShareButton } from "@/components/ui/ShareButton";
import { DemoContentLabel } from "@/components/ui/SourceLabels";
import { formatDate } from "@/lib/format";
import { listDiscussions } from "@/lib/repositories/community";
import { getArticleBySlug, getArticlesBySlugs } from "@/lib/repositories/knowledge";
import { getDocuments } from "@/lib/repositories/sources";
import { getProfileSummaries } from "@/lib/repositories/users";
import { siteUrl } from "@/lib/site";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  return { title: article ? `${article.title} — Knowledge Base` : "Article not found" };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  const [documents, related, discussions] = await Promise.all([
    getDocuments(article.sections.flatMap((s) => s.citations.map((c) => c.sourceDocumentId))),
    getArticlesBySlugs(article.relatedArticleSlugs),
    listDiscussions({ category: article.topic, sort: "top", limit: 3 }),
  ]);
  const documentMap = new Map(documents.map((d) => [d.id, d]));
  const reviewer = article.reviewedById ? ((await getProfileSummaries([article.reviewedById])).get(article.reviewedById) ?? null) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_1fr_17rem]">
      {/* Table of contents */}
      <nav aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-20">
          <Link href="/knowledge" className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
            <Icon name="chevronRight" className="h-3 w-3 rotate-180" />
            Knowledge Base
          </Link>
          <p className="mb-2 font-mono text-2xs font-semibold uppercase tracking-widest text-muted">On this page</p>
          <ol className="space-y-0.5 border-l border-line">
            {article.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-3 text-xs text-body hover:border-accent hover:text-accent">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <article className="min-w-0 rounded-md border border-line bg-surface">
        <header className="border-b border-line p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <TopicBadge topic={article.topic} />
            {article.isDemo && <DemoContentLabel />}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{article.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-body">{article.summary}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-2xs text-muted">
              Last reviewed {formatDate(article.lastReviewedAt)}
              {reviewer && (
                <>
                  {" "}by{" "}
                  <Link href={`/members/${reviewer.handle}`} className="font-medium text-body hover:text-accent">
                    {reviewer.displayName}
                  </Link>
                </>
              )}
            </p>
            <ShareButton url={siteUrl(`/knowledge/${article.slug}`)} title={article.title} text={article.summary} contentType="knowledge-article" contentId={article.id} />
          </div>
          {/* Mobile section jump */}
          <details className="mt-4 rounded-md border border-line lg:hidden">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-body">Jump to section ({article.sections.length})</summary>
            <ol className="border-t border-line px-3 py-2">
              {article.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block py-1 text-xs text-accent">
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </details>
        </header>

        <div className="divide-y divide-line">
          {article.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-h`} className="scroll-mt-20 p-5 sm:p-6">
              <h2 id={`${section.id}-h`} className="text-base font-semibold text-ink">
                {section.heading}
              </h2>
              <div className="prose-body mt-2 text-sm leading-relaxed text-body">
                {section.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {section.citations.length > 0 ? (
                <CitationList citations={section.citations} documents={documentMap} />
              ) : (
                <p className="mt-3 text-2xs italic text-muted">No citations — this section summarises community practice and is not a regulatory statement.</p>
              )}
            </section>
          ))}
        </div>
      </article>

      <aside className="space-y-6">
        <Panel title="Still unclear?" icon="bot">
          <p className="text-xs text-body">Ask RegBot a specific question about {article.title}, or put it to practitioners.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AskRegBotButton question={`${article.title}: `} autoSubmit={false}>
              RegBot
            </AskRegBotButton>
            <ButtonLink href={`/community/new?category=${article.topic}`} size="sm" icon="users">
              Community
            </ButtonLink>
          </div>
        </Panel>
        {related.length > 0 && (
          <Panel title="Related topics" icon="book" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {related.map((a) => (
                <li key={a.id}>
                  <Link href={`/knowledge/${a.slug}`} className="flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-ink hover:bg-canvas hover:text-accent">
                    {a.title}
                    <Icon name="chevronRight" className="h-3.5 w-3.5 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {discussions.length > 0 && (
          <Panel title="Implementation questions" icon="message" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {discussions.map((d) => (
                <DiscussionRow key={d.id} discussion={d} variant="compact" />
              ))}
            </ul>
          </Panel>
        )}
      </aside>
    </div>
  );
}
