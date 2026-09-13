import Link from "next/link";
import { DailyChallengeTeaser } from "./_home/DailyChallengeTeaser";
import { ContributorList } from "@/components/community/ContributorList";
import { DiscussionRow } from "@/components/community/DiscussionRow";
import { RegulatorySourceCard } from "@/components/radar/RegulatorySourceCard";
import { AskRegBotButton, RegBotQuickAsk } from "@/components/regbot/AskRegBot";
import { MilestoneList } from "@/components/timeline/MilestoneList";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { SourceTypeLabel } from "@/components/ui/SourceLabels";
import { EmptyState } from "@/components/ui/States";
import { topicLabel } from "@/data/topics";
import { getSession } from "@/lib/auth/session";
import { SOURCE_TYPE_ORDER } from "@/lib/constants";
import { isWithinDays } from "@/lib/format";
import { getDailyQuestion } from "@/lib/repositories/challenges";
import { countActiveDiscussions, listDiscussions, listMostDiscussedThisWeek } from "@/lib/repositories/community";
import { listArticles } from "@/lib/repositories/knowledge";
import { listRadarSources } from "@/lib/repositories/sources";
import { listMilestones } from "@/lib/repositories/timeline";
import { getLatestUpdateBySource, listUpdates } from "@/lib/repositories/updates";
import { listTopContributors } from "@/lib/repositories/users";

function HeroStat({ icon, value, label, href }: { icon: IconName; value: string; label: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 hover:border-white/20 hover:bg-white/[0.07]">
      <Icon name={icon} className="text-slate-400 group-hover:text-white" />
      <div>
        <p className="font-mono text-lg font-semibold leading-none text-white">{value}</p>
        <p className="mt-1 text-2xs text-slate-400">{label}</p>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [session, radarSources, latestBySource, updates, trending, mostDiscussed, contributors, milestones, articles, dailyQuestion, activeDiscussions] = await Promise.all([
    getSession(),
    listRadarSources(),
    getLatestUpdateBySource(),
    listUpdates(),
    listDiscussions({ sort: "trending", limit: 5 }),
    listMostDiscussedThisWeek(5),
    listTopContributors(5),
    listMilestones({ limit: 4 }),
    listArticles(),
    getDailyQuestion(),
    countActiveDiscussions(7),
  ]);

  const updatesThisWeek = updates.filter((u) => isWithinDays(u.publishedAt, 7)).length;

  return (
    <div className="space-y-6">
      <section aria-labelledby="hero-heading" className="overflow-hidden rounded-md border border-navy-3 bg-navy text-white">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <div>
            <p className="font-mono text-2xs font-semibold uppercase tracking-[0.2em] text-sky-300">Regulatory Reporting Community</p>
            <h1 id="hero-heading" className="mt-3 max-w-2xl text-2xl font-semibold leading-tight tracking-tight sm:text-[2rem] sm:leading-[1.2]">
              Stay ahead of regulatory change. Learn from practitioners. Solve reporting problems together.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-300">
              The community and intelligence layer for EMIR, UK EMIR, SFTR, CFTC, SEC and MiFIR reporting professionals — updates from official sources, practitioner
              discussion, and cited research in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href="/radar" variant="primary" iconRight="arrowRight">
                Explore Regulatory Updates
              </ButtonLink>
              <ButtonLink href="/community/new" variant="inverse" icon="users">
                Ask the Community
              </ButtonLink>
              <AskRegBotButton variant="inverse" size="md" className="border-transparent bg-transparent hover:bg-white/10" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <HeroStat icon="radar" value={String(updatesThisWeek)} label="Regulatory updates this week" href="/radar" />
              <HeroStat icon="message" value={String(activeDiscussions)} label="Active discussions (7 days)" href="/community" />
              <HeroStat icon="calendar" value={String(milestones.length)} label="Upcoming milestones" href="/timeline" />
              <HeroStat icon="book" value={String(articles.length)} label="Knowledge Base topics" href="/knowledge" />
            </div>
            <RegBotQuickAsk />
          </div>
        </div>
      </section>

      <Panel id="radar" eyebrow="Official sources" title="Regulatory Radar" icon="radar" action={{ href: "/radar", label: "All updates" }} bodyClassName="p-3 sm:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {radarSources.map((source) => (
            <RegulatorySourceCard key={source.id} source={source} update={latestBySource.get(source.id) ?? null} />
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Panel
            title="Trending in Regulatory Reporting"
            icon="flame"
            action={{ href: "/community", label: "Community" }}
            bodyClassName="p-0"
            headerRight={
              <ButtonLink href="/community/new" size="sm" icon="plus" className="hidden sm:inline-flex">
                New discussion
              </ButtonLink>
            }
          >
            {trending.length === 0 ? (
              <EmptyState icon="message" title="No discussions yet" description="Start the first discussion for the community." />
            ) : (
              <ul className="divide-y divide-line">
                {trending.map((d) => (
                  <DiscussionRow key={d.id} discussion={d} />
                ))}
              </ul>
            )}
          </Panel>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Panel title="Most Discussed This Week" icon="message" bodyClassName="p-0">
              {mostDiscussed.length === 0 ? (
                <EmptyState icon="message" title="Quiet week" description="No discussion activity in the last 7 days." className="py-6" />
              ) : (
                <ul className="divide-y divide-line">
                  {mostDiscussed.map((d) => (
                    <DiscussionRow key={d.id} discussion={d} variant="compact" />
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Daily Challenge" icon="trophy" action={{ href: "/challenges", label: "Challenges" }}>
              <DailyChallengeTeaser prompt={dailyQuestion.prompt} hasScenario={dailyQuestion.scenario !== null} />
            </Panel>
          </div>
        </div>

        <aside className="min-w-0 space-y-6" aria-label="Dashboard sidebar">
          {!session && (
            <section className="rounded-md border border-accent/30 bg-accent-soft p-4" aria-labelledby="join-heading">
              <h2 id="join-heading" className="text-sm font-semibold text-ink">
                Join the network
              </h2>
              <p className="mt-1 text-xs text-body">Create a professional profile to ask questions, reply, vote and follow experts in your field.</p>
              <div className="mt-3 flex gap-2">
                <ButtonLink href="/signup" size="sm" variant="primary">
                  Create account
                </ButtonLink>
                <ButtonLink href="/login" size="sm">
                  Sign in
                </ButtonLink>
              </div>
            </section>
          )}

          <Panel title="Upcoming Milestones" icon="calendar" action={{ href: "/timeline", label: "Timeline" }} bodyClassName="p-0">
            <MilestoneList milestones={milestones} compact />
          </Panel>

          <Panel title="Most Helpful Contributors" icon="users" bodyClassName="p-0">
            <ContributorList profiles={contributors} />
          </Panel>

          <Panel title="Knowledge Base" icon="book" action={{ href: "/knowledge", label: "Browse" }} bodyClassName="p-3">
            <ul className="grid gap-1">
              {articles.slice(0, 8).map((a) => (
                <li key={a.id}>
                  <Link href={`/knowledge/${a.slug}`} className="flex items-center justify-between gap-3 rounded border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:border-accent/40 hover:text-accent">
                    <span className="truncate">{a.title}</span>
                    <span className="shrink-0 font-mono text-2xs uppercase text-muted">{topicLabel(a.topic)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="How to read sources" icon="shield">
            <p className="mb-3 text-xs text-body">Every answer and article states where information comes from. Community opinion is never presented as regulatory fact.</p>
            <ul className="space-y-1.5">
              {SOURCE_TYPE_ORDER.map((t) => (
                <li key={t}>
                  <SourceTypeLabel type={t} size="xs" />
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
