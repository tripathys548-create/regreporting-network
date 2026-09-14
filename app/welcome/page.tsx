import type { Metadata } from "next";
import { AskRegBotButton } from "@/components/regbot/AskRegBot";
import { NewsletterSignupForm } from "@/components/newsletter/NewsletterSignupForm";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { requirePageSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function WelcomePage() {
  const session = await requirePageSession("/welcome");
  const first = session.profile.displayName.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-md border border-line bg-surface p-6 text-center sm:p-8">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="check" className="h-5 w-5" />
        </span>
        <p className="mt-3 font-mono text-2xs font-semibold uppercase tracking-widest text-muted">Welcome to RegReporting Network</p>
        <h1 className="mt-1 text-xl font-semibold text-ink">Hi {first}, you're ready to explore.</h1>
        <p className="mt-2 text-sm text-body">Start here — we recommend today's Daily Reg Challenge first.</p>

        <div className="mt-6">
          <ButtonLink href="/challenges#daily" variant="primary" iconRight="arrowRight" className="w-full justify-center">
            🔥 Take today's challenge
          </ButtonLink>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <ButtonLink href="/radar" variant="secondary" size="sm">
            Explore Regulatory Radar
          </ButtonLink>
          <AskRegBotButton variant="secondary" size="sm">
            Ask RegBot
          </AskRegBotButton>
          <ButtonLink href="/community" variant="secondary" size="sm">
            Join Community
          </ButtonLink>
        </div>

        <p className="mt-6 text-2xs text-muted">
          We've also sent a welcome email to <span className="font-medium text-ink">{session.user.email}</span> with a quick tour of what you can do here.
        </p>

        <div className="mt-6 border-t border-line pt-5 text-left">
          <p className="text-xs font-semibold text-ink">Didn't opt in during signup?</p>
          <p className="mt-1 text-xs text-muted">You can still receive the weekly RegReporting newsletter — this stays optional and separate from your account.</p>
          <div className="mt-3">
            <NewsletterSignupForm source="homepage" defaultEmail={session.user.email} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
