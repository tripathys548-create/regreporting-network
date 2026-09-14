import type { Metadata } from "next";
import Link from "next/link";
import { DailyRegChallenge } from "@/components/challenges/DailyRegChallenge";
import { ChallengeStats } from "@/components/challenges/DailyChallenge";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, TopicBadge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { DemoContentLabel } from "@/components/ui/SourceLabels";
import { getLeaderboard, listChallenges } from "@/lib/repositories/challenges";
import { getProfileSummaries } from "@/lib/repositories/users";
import type { ChallengeType, Difficulty } from "@/types";

export const metadata: Metadata = { title: "Reg Reporting Challenge" };

const TYPE_ICON: Record<ChallengeType, IconName> = { "spot-the-rejection": "search", "regulatory-quiz": "book", "fix-the-report": "settings" };
const DIFFICULTY_LABEL: Record<Difficulty, string> = { foundation: "Foundation", practitioner: "Practitioner", expert: "Expert" };

export default async function ChallengesPage() {
  const [challenges, leaderboard] = await Promise.all([listChallenges(), getLeaderboard()]);
  const profiles = await getProfileSummaries(leaderboard.map((e) => e.userId));

  return (
    <>
      <PageHeader
        eyebrow="Professional training"
        title="Reg Reporting Challenge"
        description="Short, scenario-based exercises that mirror real reporting problems: spot the rejection, fix the report, and test your regulatory knowledge."
        meta={<DemoContentLabel />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <Panel id="daily" title="Daily Reg Challenge" icon="calendar" headerRight={<Badge tone="accent">5 questions · up to 500 XP</Badge>}>
            <DailyRegChallenge />
          </Panel>

          <section aria-labelledby="sets-heading">
            <h2 id="sets-heading" className="mb-3 text-sm font-semibold text-ink">
              Challenge sets
            </h2>
            <ul className="grid gap-3 md:grid-cols-3">
              {challenges.map((c) => (
                <li key={c.id}>
                  <Link href={`/challenges/${c.slug}`} className="group flex h-full flex-col rounded-md border border-line bg-surface p-4 hover:border-accent/40">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-navy text-white">
                      <Icon name={TYPE_ICON[c.type]} />
                    </span>
                    <h3 className="mt-3 text-sm font-semibold text-ink group-hover:text-accent">{c.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-body">{c.description}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                      <TopicBadge topic={c.topic} />
                      <Badge tone="outline">{DIFFICULTY_LABEL[c.difficulty]}</Badge>
                      <span className="ml-auto font-mono text-2xs text-muted">
                        {c.questionIds.length}Q · ~{c.estimatedMinutes}m
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6">
          <Panel title="Your progress" icon="trophy">
            <ChallengeStats leaderboard={leaderboard} />
            <p className="mt-3 text-2xs text-muted">Your progress is stored in this browser.</p>
          </Panel>

          <Panel title="Leaderboard" icon="layers" bodyClassName="p-0" headerRight={<span className="text-2xs text-muted">All time</span>}>
            <ol className="divide-y divide-line">
              {leaderboard.map((entry) => {
                const profile = profiles.get(entry.userId);
                if (!profile) return null;
                return (
                  <li key={entry.userId} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-5 font-mono text-xs font-semibold text-muted">{entry.rank}</span>
                    <Avatar initials={profile.initials} size="sm" />
                    <Link href={`/members/${profile.handle}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink hover:text-accent">
                      {profile.displayName}
                    </Link>
                    <span className="inline-flex items-center gap-0.5 font-mono text-2xs text-signal" title={`${entry.streakDays}-day streak`}>
                      <Icon name="flame" className="h-3 w-3" />
                      {entry.streakDays}
                    </span>
                    <span className="w-12 text-right font-mono text-xs font-semibold text-ink">{entry.score}</span>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <NewsletterCTA source="challenges" />
        </aside>
      </div>
    </>
  );
}
