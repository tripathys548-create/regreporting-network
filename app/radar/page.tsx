import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { RegulatorySourceCard } from "@/components/radar/RegulatorySourceCard";
import { UpdateRow } from "@/components/radar/UpdateRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { DemoContentLabel, SourceTypeLabel } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { SOURCE_TYPE_ORDER, TIER_LABEL } from "@/lib/constants";
import { firstParam, type SearchParams } from "@/lib/params";
import { getSourceSync, listRadarSources, listSources } from "@/lib/repositories/sources";
import { getLatestUpdateBySource, listUpdates } from "@/lib/repositories/updates";

export const metadata: Metadata = { title: "Regulatory Radar" };

export default async function RadarPage({ searchParams }: { searchParams: SearchParams }) {
  const [allSources, radarSources, latestBySource] = await Promise.all([listSources(), listRadarSources(), getLatestUpdateBySource()]);
  const sourceSlug = firstParam(searchParams, "source");
  const activeSource = allSources.find((s) => s.slug === sourceSlug) ?? null;
  const updates = await listUpdates({ sourceId: activeSource?.id });

  const chip = (active: boolean) =>
    clsx("shrink-0 rounded-md border px-2.5 py-1 font-mono text-2xs font-semibold uppercase tracking-wider", active ? "border-navy bg-navy text-white" : "border-line bg-surface text-body hover:border-muted/40");

  return (
    <>
      <PageHeader
        eyebrow="Official sources"
        title="Regulatory Radar"
        description="The latest publications from regulators, standard setters and industry bodies, labelled by source and linked to the original page."
        meta={<DemoContentLabel />}
        actions={
          <ButtonLink href="/timeline" icon="calendar">
            Regulatory timeline
          </ButtonLink>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {radarSources.map((source) => (
          <RegulatorySourceCard key={source.id} source={source} update={latestBySource.get(source.id) ?? null} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Panel title={activeSource ? `Updates from ${activeSource.shortName}` : "All updates"} icon="radar" bodyClassName="p-0">
          <nav aria-label="Filter by source" className="overflow-x-auto border-b border-line px-4 py-2.5">
            <ul className="flex gap-1.5">
              <li>
                <Link href="/radar" className={chip(!activeSource)} aria-current={!activeSource ? "true" : undefined}>
                  All
                </Link>
              </li>
              {allSources.map((s) => (
                <li key={s.id}>
                  <Link href={`/radar?source=${s.slug}`} className={chip(activeSource?.id === s.id)} aria-current={activeSource?.id === s.id ? "true" : undefined}>
                    {s.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          {updates.length === 0 ? (
            <EmptyState
              icon="radar"
              title={`No published updates from ${activeSource?.shortName ?? "any source"}`}
              description="New publications appear here once they have been ingested and approved by an editor."
              action={
                <ButtonLink href="/radar" size="sm">
                  Show all sources
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {updates.map((u) => (
                <UpdateRow key={u.id} update={u} source={getSourceSync(u.sourceId)} />
              ))}
            </ul>
          )}
        </Panel>

        <aside className="space-y-6">
          <Panel title="Trusted source policy" icon="shield">
            <ol className="space-y-2 text-xs text-body">
              {([1, 2, 3, 4] as const).map((tier) => (
                <li key={tier}>
                  <p className="font-semibold text-ink">{TIER_LABEL[tier]}</p>
                  <p className="text-muted">
                    {tier === 4 ? "Member discussions" : allSources.filter((s) => s.tier === tier).map((s) => s.shortName).join(", ")}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-line pt-3 text-2xs text-muted">When sources conflict, the conflict is shown — never silently resolved.</p>
          </Panel>
          <Panel title="Source types" icon="layers">
            <ul className="space-y-1.5">
              {SOURCE_TYPE_ORDER.map((t) => (
                <li key={t}>
                  <SourceTypeLabel type={t} size="xs" />
                </li>
              ))}
            </ul>
          </Panel>
          <p className="px-1 text-2xs leading-relaxed text-muted">
            Phase 1 shows sample updates. &ldquo;Read original source&rdquo; links go to each publisher&apos;s official website until ingestion supplies verified deep links.
          </p>
        </aside>
      </div>
    </>
  );
}
