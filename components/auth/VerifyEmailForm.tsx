"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field } from "./Field";

export function VerifyEmailForm({ email, next, showDevMailbox }: { email: string; next: string; showDevMailbox: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from the email.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.verifyEmail(code);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify the code.");
      setSubmitting(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      await api.resendVerification();
      setNotice("A new code has been sent. Earlier codes no longer work.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a new code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="flex items-start gap-2 rounded-md bg-canvas px-3 py-2.5 text-sm text-body">
        <Icon name="mail" className="mt-0.5 text-muted" />
        <span>
          We sent a 6-digit code to <strong className="font-semibold text-ink">{email}</strong>. It expires in 15 minutes.
        </span>
      </p>
      {showDevMailbox && (
        <p className="rounded-md border border-dashed border-signal/40 bg-signal-soft px-3 py-2 text-xs text-signal">
          Development: no email provider is connected. Open the{" "}
          <Link href="/dev/mailbox" target="_blank" className="font-semibold underline">
            dev mailbox
          </Link>{" "}
          (or check the server log) to read the code.
        </p>
      )}
      <Field id="code" label="Verification code" error={error ?? undefined}>
        <input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-invalid={error ? "true" : undefined}
          aria-describedby="code-help"
          className="field-input text-center font-mono text-lg tracking-[0.5em]"
          placeholder="••••••"
        />
      </Field>
      {notice && (
        <p className="text-xs text-good" role="status">
          {notice}
        </p>
      )}
      <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
        {submitting ? "Verifying…" : "Verify email"}
      </Button>
      <p className="text-center text-sm text-muted">
        Didn&apos;t get it?{" "}
        <button type="button" onClick={resend} disabled={resending} className="font-medium text-accent hover:text-accent-strong disabled:text-muted">
          {resending ? "Sending…" : "Send a new code"}
        </button>
      </p>
    </form>
  );
}
