import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiscussionRow } from "@/components/community/DiscussionRow";
import { FollowButton } from "@/components/profile/FollowButton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, TopicBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import { getSession, getViewerStatus } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { listDiscussions, listSavedDiscussions } from "@/lib/repositories/community";
import { getProfileByHandle, isFollowing } from "@/lib/repositories/users";

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const profile = await getProfileByHandle(params.handle);
  return { title: profile?.displayName ?? "Member not found" };
}

export default async function ProfilePage({ params }: { params: { handle: string } }) {
  const [profile, session] = await Promise.all([getProfileByHandle(params.handle), getSession()]);
  if (!profile) notFound();

  const viewerId = session?.user.id ?? null;
  const isSelf = viewerId === profile.userId;
  const [discussions, following, saved] = await Promise.all([
    listDiscussions({ authorId: profile.userId, sort: "latest" }),
    isFollowing(viewerId, "user", profile.userId),
    isSelf ? listSavedDiscussions(profile.userId) : Promise.resolve([]),
  ]);

  const stats = [
    { label: "Contributions", value: profile.stats.contributions },
    { label: "Helpful answers", value: profile.stats.helpfulAnswers },
    { label: "Reputation", value: profile.stats.reputation },
  ];

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-md border border-line bg-surface p-5" aria-labelledby="profile-name">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <Avatar initials={profile.initials} size="lg" verified={profile.verifiedPractitioner} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 id="profile-name" className="text-xl font-semibold text-ink">
                  {profile.displayName}
                </h1>
                {profile.verifiedPractitioner ? (
                  <Badge tone="accent" title="Practitioner status verified by moderators">
                    <Icon name="shieldCheck" className="h-3 w-3" />
                    Verified practitioner
                  </Badge>
                ) : (
                  <Badge tone="outline">Practitioner status not verified</Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm font-medium text-body">
                {profile.jobTitle} <span className="text-muted">at</span> {profile.organisationName}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Experience</dt>
                  <dd className="font-medium text-ink">
                    {profile.yearsExperience} {profile.yearsExperience === 1 ? "year" : "years"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Organisation type</dt>
                  <dd className="font-medium text-ink">{profile.organisationType}</dd>
                </div>
                <div>
                  <dt className="text-muted">Location</dt>
                  <dd className="font-medium text-ink">{profile.location || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Member since</dt>
                  <dd className="font-medium text-ink">{formatDate(profile.joinedAt)}</dd>
                </div>
              </dl>
            </div>
            {isSelf ? (
              <ButtonLink href="/settings/profile" size="sm" icon="settings">
                Edit profile
              </ButtonLink>
            ) : (
              <FollowButton targetType="user" targetId={profile.userId} initialFollowing={following} viewerStatus={getViewerStatus(session)} label="Follow expert" />
            )}
          </div>
          {profile.bio ? (
            <p className="mt-4 border-t border-line pt-4 text-sm leading-relaxed text-body">{profile.bio}</p>
          ) : (
            isSelf && <p className="mt-4 border-t border-line pt-4 text-sm text-muted">Add a professional summary so members know where you can help.</p>
          )}
        </section>

        <Panel title="Expertise" icon="layers">
          {profile.expertise.length ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.expertise.map((t) => (
                <TopicBadge key={t} topic={t} href={`/community?category=${t}`} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No areas of expertise listed yet.</p>
          )}
        </Panel>

        <Panel title="Discussions started" icon="message" bodyClassName="p-0">
          {discussions.length === 0 ? (
            <EmptyState icon="message" title="No discussions yet" description={isSelf ? "Ask your first question to the community." : `${profile.displayName} hasn't started any discussions.`} className="py-8" />
          ) : (
            <ul className="divide-y divide-line">
              {discussions.map((d) => (
                <DiscussionRow key={d.id} discussion={d} />
              ))}
            </ul>
          )}
        </Panel>

        {isSelf && (
          <Panel title="Saved discussions" icon="bookmark" bodyClassName="p-0" headerRight={<span className="text-2xs text-muted">Only visible to you</span>}>
            {saved.length === 0 ? (
              <EmptyState icon="bookmark" title="Nothing saved yet" description="Use Save on a discussion to keep it here." className="py-8" />
            ) : (
              <ul className="divide-y divide-line">
                {saved.map((d) => (
                  <DiscussionRow key={d.id} discussion={d} variant="compact" />
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      <aside className="min-w-0 space-y-6">
        <Panel title="Contribution record" icon="trophy">
          <dl className="grid grid-cols-3 gap-2 text-center">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse rounded-md bg-canvas px-2 py-2.5">
                <dt className="text-[10px] uppercase leading-tight tracking-wide text-muted">{s.label}</dt>
                <dd className="font-mono text-lg font-semibold text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-2xs text-muted">
            {profile.stats.followers} {profile.stats.followers === 1 ? "member follows" : "members follow"} this expert. Reputation = 15 per accepted answer + 2 per upvote received + 1 per
            contribution.
          </p>
        </Panel>
      </aside>
    </div>
  );
}
