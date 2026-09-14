"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export type NewsletterConsentSource = "homepage" | "footer" | "regulatory-radar" | "knowledge-base" | "challenges";

interface NewsletterSignupFormProps {
  source: NewsletterConsentSource;
  defaultEmail?: string;
  compact?: boolean;
}

/** The one shared newsletter signup form, reused wherever the site offers the newsletter. */
export function NewsletterSignupForm({ source, defaultEmail = "", compact = false }: NewsletterSignupFormProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"confirmation-sent" | "reconfirmation-sent" | "already-active" | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!consent) {
      setError("Please check the box to agree to receive the newsletter.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent, source }),
      });
      const data = (await res.json().catch(() => ({}))) as { outcome?: typeof outcome; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not subscribe right now. Please try again.");
      setOutcome(data.outcome ?? "confirmation-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not subscribe right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (outcome === "already-active") {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-good">
        <Icon name="check" className="h-4 w-4" /> You're already subscribed.
      </p>
    );
  }
  if (outcome) {
    return (
      <p className="flex items-start gap-2 text-sm font-medium text-good">
        <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          You're subscribed. <span className="block font-normal text-body">Please check your email to confirm your subscription.</span>
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "space-y-2.5" : "space-y-3"}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          aria-label="Email address"
          className="field-input flex-1"
        />
        <Button type="submit" variant="primary" disabled={submitting} className="shrink-0">
          {submitting ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      <label className="flex items-start gap-2 text-xs text-body">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-accent" />
        <span>I agree to receive the RegReporting Network newsletter.</span>
      </label>
      {error && (
        <p className="text-xs text-bad" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
