import type { Metadata } from "next";
import { CategoryFilter, SortTabs, SORT_OPTIONS } from "@/components/community/CategoryFilter";
import { ContributorList } from "@/components/community/ContributorList";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";
import { DiscussionRow } from "@/components/community/DiscussionRow";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import { isTopicSlug, topicLabel } from "@/data/topics";
import { firstParam, type SearchParams } from "@/lib/params";
import { countDiscussionsByCategory, listDiscussions, listMostDiscussedThisWeek, type DiscussionSort } from "@/lib/repositories/community";
import { listTopContributors } from "@/lib/repositories/users";

export const metadata: Metadata = { title: "Community" };

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const rawCategory = firstParam(searchParams, "category") ?? "";
  const category = isTopicSlug(rawCategory) ? rawCategory : null;
  const rawSort = firstParam(searchParams, "sort");
  const sort: DiscussionSort = SORT_OPTIONS.find((o) => o.value === rawSort)?.value ?? "trending";

  const [discussions, counts, mostDiscussed, contributors] = await Promise.all([
    listDiscussions({ category: category ?? undefined, sort }),
    countDiscussionsByCategory(),
    listMostDiscussedThisWeek(4),
    listTopContributors(5),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Practitioner discussion"
        title="Community"
        description="Ask implementation questions, compare approaches and learn how other firms handle reporting problems. Replies are member interpretation — always check the official source."
        actions={
          <>
            <AskRegBotButton size="md">Ask RegBot first</AskRegBotButton>
            <ButtonLink href={`/community/new${category ? `?category=${category}` : ""}`} variant="primary" icon="plus">
              Start a discussion
            </ButtonLink>
          </>
        }
      />

      <CategoryFilter active={category} sort={sort} counts={counts} />

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_19rem]">
        <Panel
          title={category ? `${topicLabel(category)} discussions` : "All discussions"}
          headerRight={<SortTabs active={sort} category={category} />}
          bodyClassName="p-0"
        >
          {discussions.length === 0 ? (
            <EmptyState
              icon="message"
              title={sort === "unanswered" ? "No unanswered discussions" : "No discussions in this category yet"}
              description={sort === "unanswered" ? "Every discussion here has an accepted answer." : "Start the first discussion and invite practitioners to share their approach."}
              action={
                <ButtonLink href={`/community/new${category ? `?category=${category}` : ""}`} variant="primary" size="sm" icon="plus">
                  Start a discussion
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {discussions.map((d) => (
                <DiscussionRow key={d.id} discussion={d} />
              ))}
            </ul>
          )}
        </Panel>

        <aside className="min-w-0 space-y-6">
          {mostDiscussed.length > 0 && (
            <Panel title="Most Discussed This Week" icon="flame" bodyClassName="p-0">
              <ul className="divide-y divide-line">
                {mostDiscussed.map((d) => (
                  <DiscussionRow key={d.id} discussion={d} variant="compact" />
                ))}
              </ul>
            </Panel>
          )}
          {contributors.length > 0 && (
            <Panel title="Most Helpful Contributors" icon="users" bodyClassName="p-0">
              <ContributorList profiles={contributors} />
            </Panel>
          )}
          <Panel title="Community standards" icon="shield">
            <ul className="space-y-2 text-xs text-body">
              {[
                "Cite official sources when describing a requirement.",
                "Label interpretation as interpretation.",
                "Never post client names, real LEIs, UTIs or trade data.",
                "Email verification is required to post, reply and vote.",
                "Report content that breaks these standards.",
              ].map((rule) => (
                <li key={rule} className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-3.5 w-3.5 text-good" />
                  {rule}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  );
}
