import type { Metadata } from "next";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { requirePageSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Edit profile" };

export default async function ProfileSettingsPage() {
  const { user, profile } = await requirePageSession("/settings/profile");

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edit profile" description="Keep your professional details current — they give context to your answers." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 rounded-md border border-line bg-surface p-5">
          <ProfileForm
            handle={profile.handle}
            initialBio={profile.bio}
            initial={{
              displayName: profile.displayName,
              jobTitle: profile.jobTitle,
              organisationName: profile.organisationName,
              organisationType: profile.organisationType,
              yearsExperience: String(profile.yearsExperience),
              location: profile.location,
              expertise: profile.expertise,
            }}
          />
        </div>
        <aside className="min-w-0 space-y-6">
          <Panel title="Account" icon="lock">
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="break-all font-medium text-ink">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted">Status</dt>
                <dd className="mt-0.5">{user.emailVerifiedAt ? <Badge tone="good">Email verified</Badge> : <Badge tone="signal">Email not verified</Badge>}</dd>
              </div>
              <div>
                <dt className="text-muted">Member since</dt>
                <dd className="font-medium text-ink">{formatDate(user.createdAt)}</dd>
              </div>
            </dl>
            {!user.emailVerifiedAt && (
              <ButtonLink href="/verify-email" size="sm" variant="primary" className="mt-3">
                Verify email
              </ButtonLink>
            )}
          </Panel>
          <Panel title="Practitioner verification" icon="shieldCheck">
            <p className="text-xs text-body">
              {profile.verifiedPractitioner
                ? "Your practitioner status has been verified by moderators."
                : "Moderators verify practitioner status separately from email verification."}
            </p>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
