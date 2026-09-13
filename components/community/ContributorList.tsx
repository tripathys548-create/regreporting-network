import Link from "next/link";
import { topicLabel } from "@/data/topics";
import type { Profile } from "@/types";
import { Avatar } from "@/components/ui/Avatar";

export function ContributorList({ profiles }: { profiles: Profile[] }) {
  return (
    <ol className="divide-y divide-line">
      {profiles.map((p, i) => (
        <li key={p.userId} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-4 font-mono text-2xs text-muted">{i + 1}</span>
          <Avatar initials={p.initials} verified={p.verifiedPractitioner} />
          <div className="min-w-0 flex-1">
            <Link href={`/members/${p.handle}`} className="block truncate text-[13px] font-semibold text-ink hover:text-accent">
              {p.displayName}
            </Link>
            <p className="truncate text-2xs text-muted">
              {p.jobTitle} · {p.expertise.slice(0, 2).map(topicLabel).join(", ")}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs font-semibold text-ink">{p.stats.helpfulAnswers}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">helpful</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
