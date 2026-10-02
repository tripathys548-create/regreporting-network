"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Field } from "./Field";

/** Settings panel control: permanently deletes the account after password + "DELETE" confirmation. */
export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "deleting" } | { kind: "error"; message: string }>({ kind: "idle" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    setStatus({ kind: "deleting" });
    try {
      await api.deleteAccount({ password, confirm });
      window.location.assign("/account-deletion?deleted=1");
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as Record<string, string>);
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not delete your account." });
    }
  }

  if (!open) {
    return (
      <>
        <p className="text-xs text-body">Permanently delete your account and personal data. Your posts stay visible as &ldquo;Former member&rdquo;.</p>
        <Button size="sm" variant="dangerOutline" className="mt-3" onClick={() => setOpen(true)}>
          Delete account
        </Button>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <p className="text-xs text-body">
        This removes your profile, email address, votes, saved items, follows, notifications and newsletter subscription. It can&apos;t be undone.
      </p>
      {status.kind === "error" && !errors.password && !errors.confirm && (
        <p className="field-error" role="alert">
          {status.message}
        </p>
      )}
      <Field id="delete-password" label="Current password" error={errors.password}>
        <input id="delete-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" />
      </Field>
      <Field id="delete-confirm" label="Type DELETE to confirm" error={errors.confirm}>
        <input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="field-input" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="danger" disabled={status.kind === "deleting" || confirm !== "DELETE" || !password}>
          {status.kind === "deleting" ? "Deleting…" : "Permanently delete"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
