"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { Field } from "./Field";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.login({ email, password, next });
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <ErrorState title="Sign-in failed" description={error} />}
      <Field id="login-email" label="Email">
        <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
      </Field>
      <Field id="login-password" label="Password">
        <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </Field>
      <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted">
        New to RegReporting Network?{" "}
        <Link href="/signup" className="font-medium text-accent hover:text-accent-strong">
          Create an account
        </Link>
      </p>
    </form>
  );
}
