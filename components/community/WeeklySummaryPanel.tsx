import { Panel } from "@/components/ui/Panel";
import type { WeeklySummary } from "@/lib/repositories/weekly";

/** The single, consolidated "This Week in Regulatory Reporting" homepage section — see spec §2 (no duplicate weekly sections). */
export function WeeklySummaryPanel({ summary }: { summary: WeeklySummary }) {
  return (
    <Panel title="This Week in Regulatory Reporting" icon="calendar" action={{ href: "/radar", label: "View All Updates" }}>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="font-mono text-2xl font-semibold text-ink">{summary.updatesCount}</p>
          <p className="text-2xs text-muted">regulatory updates</p>
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold text-ink">{summary.discussionsCount}</p>
          <p className="text-2xs text-muted">community discussions</p>
        </div>
        <div>
          <p className="font-mono text-2xl font-semibold text-ink">{summary.deadlinesCount}</p>
          <p className="text-2xs text-muted">upcoming deadlines</p>
        </div>
      </div>
      {summary.sourceBreakdown.length > 0 && (
        <dl className="mt-4 space-y-1 border-t border-line pt-3">
          {summary.sourceBreakdown.map((s) => (
            <div key={s.sourceId} className="flex items-center justify-between text-xs">
              <dt className="text-body">{s.shortName}</dt>
              <dd className="font-mono text-muted">
                {s.count} {s.count === 1 ? "update" : "updates"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
