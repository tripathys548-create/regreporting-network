import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { MilestoneList } from "@/components/timeline/MilestoneList";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DemoContentLabel } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { firstParam, type SearchParams } from "@/lib/params";
import { listMilestones } from "@/lib/repositories/timeline";
import type { Jurisdiction } from "@/types";

export const metadata: Metadata = { title: "Regulatory Timeline" };

const JURISDICTIONS: Jurisdiction[] = ["EU", "UK", "US", "Global"];

export default async function TimelinePage({ searchParams }: { searchParams: SearchParams }) {
  const raw = firstParam(searchParams, "jurisdiction");
  const jurisdiction = JURISDICTIONS.find((j) => j === raw);
  const milestones = await listMilestones({ jurisdiction });

  const chip = (active: boolean) =>
    clsx("rounded-md border px-2.5 py-1 text-xs font-medium", active ? "border-navy bg-navy text-white" : "border-line bg-surface text-body hover:border-muted/40");

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Regulatory calendar"
        title="Regulatory Timeline"
        description="Upcoming guidance, consultation deadlines, industry testing windows and implementation dates, with a countdown and a link to the official source."
        meta={<DemoContentLabel />}
      />
      <nav aria-label="Filter by jurisdiction" className="mb-6 flex flex-wrap gap-1.5">
        <Link href="/timeline" className={chip(!jurisdiction)} aria-current={!jurisdiction ? "true" : undefined}>
          All jurisdictions
        </Link>
        {JURISDICTIONS.map((j) => (
          <Link key={j} href={`/timeline?jurisdiction=${j}`} className={chip(jurisdiction === j)} aria-current={jurisdiction === j ? "true" : undefined}>
            {j}
          </Link>
        ))}
      </nav>
      {milestones.length === 0 ? (
        <div className="rounded-md border border-line bg-surface">
          <EmptyState
            icon="calendar"
            title={`No upcoming milestones for ${jurisdiction}`}
            description="Milestones appear here once added to the regulatory calendar."
            action={
              <ButtonLink href="/timeline" size="sm">
                Show all jurisdictions
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <MilestoneList milestones={milestones} />
      )}
    </div>
  );
}
