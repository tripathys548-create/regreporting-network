import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscussionRow } from "@/components/community/DiscussionRow";
import { FollowButton } from "@/components/profile/FollowButton";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";
import { getSession, getViewerStatus } from "@/lib/auth/session";
import { isFollowing } from "@/lib/repositories/users";
import { Badge, TopicBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { DemoContentLabel, SourceBadge, SourceTypeLabel, TierIndicator } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";
import { listDiscussionsByTopics } from "@/lib/repositories/community";
import { listArticles } from "@/lib/repositories/knowledge";
import { getSource } from "@/lib/repositories/sources";
import { getUpdate } from "@/lib/repositories/updates";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const update = await getUpdate(params.id);
  return { title: update?.title ?? "Update not found" };
}

export default async function UpdateDetailPage({ params }: { params: { id: string } }) {
  const update = await getUpdate(params.id);
  if (!update) notFound();
  const source = await getSource(update.sourceId);
  if (!source) notFound();

  const session = await getSession();
  const [discussions, articles, followingSource] = await Promise.all([
    listDiscussionsByTopics(update.topics, 3),
    listArticles(),
    isFollowing(session?.user.id ?? null, "source", source.id),
  ]);
  const relatedArticles = articles.filter((a) => update.topics.includes(a.topic)).slice(0, 3);
  const host = new URL(update.originalUrl).host;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <article>
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-muted">
          <Link href="/radar" className="hover:text-ink">
            Regulatory Radar
          </Link>
          <Icon name="chevronRight" className="h-3 w-3" />
          <Link href={`/radar?source=${source.slug}`} className="hover:text-ink">
            {source.shortName}
          </Link>
        </nav>

        <div className="rounded-md border border-line bg-surface">
          <header className="border-b border-line p-5">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge name={source.shortName} tier={source.tier} verified={source.verifiedDomain} />
              <SourceTypeLabel type={source.sourceType} size="xs" />
              <TopicBadge topic={update.category} href={`/community?category=${update.category}`} />
              {update.severity !== "standard" && <Badge tone={update.severity === "critical" ? "bad" : "signal"}>{update.severity === "critical" ? "Critical" : "High impact"}</Badge>}
            </div>
            <h1 className="mt-3 text-xl font-semibold leading-snug text-ink sm:text-2xl">{update.title}</h1>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div className="flex gap-1.5">
                <dt className="text-muted">Published</dt>
                <dd className="font-mono text-body">{formatDate(update.publishedAt)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-muted">Publisher</dt>
                <dd className="text-body">{source.fullName}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-muted">Jurisdiction</dt>
                <dd className="text-body">{update.jurisdiction}</dd>
              </div>
            </dl>
          </header>

          <div className="p-5">
            <h2 className="font-mono text-2xs font-semibold uppercase tracking-widest text-muted">Summary</h2>
            <p className="mt-2 text-sm leading-relaxed text-body">{update.summary}</p>
            {update.isDemo && <DemoContentLabel className="mt-4" />}
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <ButtonLink href={update.originalUrl} external variant="primary" iconRight="external">
                Read {source.shortName} Update
              </ButtonLink>
              <span className="text-2xs text-muted">Opens {host} in a new tab</span>
            </div>
          </div>
        </div>

        <Panel title="Community discussion on this topic" icon="message" className="mt-6" bodyClassName="p-0" action={{ href: `/community?category=${update.category}`, label: "More" }}>
          {discussions.length ? (
            <ul className="divide-y divide-line">
              {discussions.map((d) => (
                <DiscussionRow key={d.id} discussion={d} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="message"
              title="No discussions yet"
              description="Be the first to discuss the implementation impact of this update."
              action={
                <ButtonLink href={`/community/new?${new URLSearchParams({ title: `Impact of: ${update.title}`, category: update.category })}`} size="sm" variant="primary">
                  Start a discussion
                </ButtonLink>
              }
            />
          )}
        </Panel>
      </article>

      <aside className="space-y-6">
        <Panel title={`Follow ${source.shortName}`} icon="bell">
          <div className="flex items-center justify-between gap-3">
            <TierIndicator tier={source.tier} />
            <FollowButton targetType="source" targetId={source.id} initialFollowing={followingSource} viewerStatus={getViewerStatus(session)} />
          </div>
          <p className="mt-2 text-2xs text-muted">Get notified when {source.shortName} publishes a new update.</p>
        </Panel>
        <Panel title="Research this update" icon="bot">
          <p className="text-xs text-body">Ask RegBot how this relates to existing requirements. Answers cite their sources.</p>
          <AskRegBotButton question={`What does "${update.title}" mean for ${update.category.toUpperCase()} reporting?`} className="mt-3" />
        </Panel>
        {relatedArticles.length > 0 && (
          <Panel title="Knowledge Base" icon="book" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {relatedArticles.map((a) => (
                <li key={a.id}>
                  <Link href={`/knowledge/${a.slug}`} className="block px-4 py-2.5 hover:bg-canvas">
                    <span className="block text-[13px] font-medium text-ink">{a.title}</span>
                    <span className="line-clamp-2 text-2xs text-muted">{a.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </aside>
    </div>
  );
}
