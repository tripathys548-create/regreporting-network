"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api/client";
import { validateProfileUpdate } from "@/lib/validation";
import { ButtonLink, Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { Field } from "./Field";
import { ProfileFields, type ProfileFieldValues } from "./ProfileFields";

export function ProfileForm({ initial, initialBio, handle }: { initial: ProfileFieldValues; initialBio: string; handle: string }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [bio, setBio] = useState(initialBio);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = { ...values, bio };
    const check = validateProfileUpdate(payload);
    if (!check.ok) {
      setErrors(check.errors as Record<string, string>);
      return;
    }
    setErrors({});
    setStatus({ kind: "saving" });
    try {
      await api.updateProfile(payload);
      setStatus({ kind: "saved" });
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as Record<string, string>);
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not save your profile." });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {status.kind === "error" && <ErrorState title="Profile not saved" description={status.message} />}
      <ProfileFields values={values} errors={errors} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
      <Field id="bio" label="Professional summary" optional error={errors.bio} hint="What you work on and where you can help. Max 600 characters.">
        <textarea id="bio" rows={4} maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} aria-describedby="bio-help" className="field-input resize-y" />
      </Field>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line pt-4">
        {status.kind === "saved" && (
          <p className="mr-auto text-sm text-good" role="status">
            Profile saved.
          </p>
        )}
        <ButtonLink href={`/members/${handle}`} variant="ghost">
          View profile
        </ButtonLink>
        <Button type="submit" variant="primary" disabled={status.kind === "saving"}>
          {status.kind === "saving" ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
