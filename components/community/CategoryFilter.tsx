import clsx from "clsx";
import Link from "next/link";
import { COMMUNITY_CATEGORIES, topicLabel } from "@/data/topics";
import type { DiscussionSort } from "@/lib/repositories/community";
import type { TopicSlug } from "@/types";

function buildHref(category: TopicSlug | null, sort: DiscussionSort) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort !== "trending") params.set("sort", sort);
  const qs = params.toString();
  return qs ? `/community?${qs}` : "/community";
}

const chip = (active: boolean) =>
  clsx(
    "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
    active ? "border-navy bg-navy text-white" : "border-line bg-surface text-body hover:border-muted/40",
  );

/** Link-based filters: shareable URLs, work without JavaScript, and keep the page server-rendered. */
export function CategoryFilter({ active, sort, counts }: { active: TopicSlug | null; sort: DiscussionSort; counts: Map<TopicSlug, number> }) {
  return (
    <nav aria-label="Filter by category" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1.5 pb-1 sm:flex-wrap">
        <li>
          <Link href={buildHref(null, sort)} className={chip(active === null)} aria-current={active === null ? "true" : undefined}>
            All
          </Link>
        </li>
        {COMMUNITY_CATEGORIES.map((slug) => (
          <li key={slug}>
            <Link href={buildHref(slug, sort)} className={chip(active === slug)} aria-current={active === slug ? "true" : undefined}>
              {topicLabel(slug)}
              <span className={clsx("font-mono text-2xs", active === slug ? "text-slate-300" : "text-muted")}>{counts.get(slug) ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export const SORT_OPTIONS: { value: DiscussionSort; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "latest", label: "Latest" },
  { value: "top", label: "Top" },
  { value: "unanswered", label: "Unanswered" },
];

export function SortTabs({ active, category }: { active: DiscussionSort; category: TopicSlug | null }) {
  return (
    <div role="tablist" aria-label="Sort discussions" className="flex gap-0.5 rounded-md border border-line bg-canvas p-0.5">
      {SORT_OPTIONS.map((opt) => (
        <Link
          key={opt.value}
          role="tab"
          aria-selected={active === opt.value}
          href={buildHref(category, opt.value)}
          className={clsx("rounded px-2.5 py-1 text-xs font-medium", active === opt.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}
