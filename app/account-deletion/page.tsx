import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = { title: "Delete your account", description: "How to delete your RegWorld (RegReporting Network) account and what data is removed." };

/** Public account-deletion page — the URL given to Google Play's Data safety form. */
export default function AccountDeletionPage({ searchParams }: { searchParams: { deleted?: string } }) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Legal" title="Delete your account" description="How to delete your RegWorld (RegReporting Network) account, in the Android app or on the web." />

      <div className="space-y-6">
        {searchParams.deleted === "1" && (
          <div className="rounded-md border border-good/30 bg-good-soft p-4 text-sm text-ink" role="status">
            Your account has been deleted and you have been signed out.
          </div>
        )}

        <Panel title="How to delete your account">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-body">
            <li>Sign in to RegWorld in the Android app or at regworldcommsind.webelvate.com.</li>
            <li>
              Open <strong>Settings → Edit profile</strong>.
            </li>
            <li>
              Under <strong>Delete account</strong>, enter your password, type DELETE and confirm.
            </li>
          </ol>
          <p className="mt-3 text-sm leading-relaxed text-body">Deletion happens immediately. If you can no longer sign in, contact the RegWorld team using the developer contact on our Google Play listing and we will delete the account for you.</p>
          <ButtonLink href="/settings/profile" variant="primary" size="sm" className="mt-4">
            Go to account settings
          </ButtonLink>
        </Panel>

        <Panel title="What is deleted">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-body">
            <li>Your email address and password</li>
            <li>Your profile: name, job title, organisation, experience, location, bio and expertise</li>
            <li>Your sessions, votes, saved discussions, follows, notifications and notification settings</li>
            <li>Your newsletter subscription and the record of emails sent to you</li>
          </ul>
        </Panel>

        <Panel title="What is kept">
          <p className="text-sm leading-relaxed text-body">
            Discussions, replies and suggestions you posted stay visible so conversations other members took part in remain readable, but they are
            shown as written by &ldquo;Former member&rdquo; and are no longer linked to your name, email or profile. A minimal audit record that an
            account was deleted is kept for security. Nothing else is retained.
          </p>
        </Panel>

        <p className="text-xs text-muted">
          See also the <Link href="/privacy" className="text-accent hover:underline">privacy notice</Link>.
        </p>
      </div>
    </div>
  );
}
