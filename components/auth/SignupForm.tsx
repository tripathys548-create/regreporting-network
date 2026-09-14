"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api/client";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/limits";
import { validateSignup } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ErrorState } from "@/components/ui/States";
import { Field } from "./Field";
import { EMPTY_PROFILE_VALUES, NameField, ProfileFields, type ProfileFieldValues } from "./ProfileFields";

export function SignupForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileFieldValues>(EMPTY_PROFILE_VALUES);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptGuidelines, setAcceptGuidelines] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = { ...profile, email, password, acceptGuidelines, newsletterOptIn };
    const check = validateSignup(payload);
    if (!check.ok) {
      setErrors(check.errors as Record<string, string>);
      setFormError("Please complete the highlighted fields.");
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await api.signup({ ...payload, website });
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as Record<string, string>);
      setFormError(err instanceof Error ? err.message : "Could not create your account.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {formError && <ErrorState title="Account not created" description={formError} />}

      <section aria-labelledby="account-heading" className="space-y-4">
        <h2 id="account-heading" className="font-mono text-2xs font-semibold uppercase tracking-widest text-muted">
          1 · Account
        </h2>
        <NameField value={profile.displayName} error={errors.displayName} onChange={(displayName) => setProfile((p) => ({ ...p, displayName }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Work email" error={errors.email} hint="We send a verification code to this address.">
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={errors.email ? "true" : undefined}
              aria-describedby="email-help"
              className="field-input"
            />
          </Field>
          <Field id="password" label="Password" error={errors.password} hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={errors.password ? "true" : undefined}
                aria-describedby="password-help"
                className="field-input pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink"
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} />
              </button>
            </div>
          </Field>
        </div>
      </section>

      <section aria-labelledby="professional-heading" className="space-y-4 border-t border-line pt-5">
        <h2 id="professional-heading" className="font-mono text-2xs font-semibold uppercase tracking-widest text-muted">
          2 · Professional details
        </h2>
        <ProfileFields values={profile} errors={errors} includeName={false} onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))} />
      </section>

      {/* Honeypot: hidden from people and assistive technology. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className="border-t border-line pt-5">
        <label className="flex items-start gap-2.5 text-sm text-body">
          <input
            type="checkbox"
            checked={acceptGuidelines}
            onChange={(e) => setAcceptGuidelines(e.target.checked)}
            aria-invalid={errors.acceptGuidelines ? "true" : undefined}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span>
            I agree to the community standards: cite official sources, label interpretation as interpretation, and never post confidential client or trade data.
          </span>
        </label>
        {errors.acceptGuidelines && (
          <p className="field-error" role="alert">
            {errors.acceptGuidelines}
          </p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-body">
          <input type="checkbox" checked={newsletterOptIn} onChange={(e) => setNewsletterOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
          <span>Send me the RegReporting Network newsletter with regulatory updates, new challenges, useful resources and major reporting developments.</span>
        </label>
        <p className="mt-1 pl-6 text-2xs text-muted">Optional — separate from your account. You can unsubscribe at any time.</p>
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Already a member?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent-strong">
            Sign in
          </Link>
        </p>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
