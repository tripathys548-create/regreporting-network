"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import type { IconName } from "@/components/ui/Icon";

async function send(endpoint: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

interface AdminActionProps {
  endpoint: string;
  method?: "POST" | "PATCH";
  body: Record<string, unknown>;
  label: string;
  icon?: IconName;
  variant?: ButtonVariant;
  /** When set, the action asks for a reason that is sent as `reasonField`. */
  reasonPrompt?: string;
  reasonField?: string;
  confirm?: string;
}

/** A staff action button that posts to an admin endpoint, then refreshes the page data. */
export function AdminAction({ endpoint, method = "POST", body, label, icon, variant = "secondary", reasonPrompt, reasonField = "reason", confirm }: AdminActionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(extra: Record<string, unknown> = {}) {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      await send(endpoint, method, { ...body, ...extra });
      setOpen(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void run({ [reasonField]: reason });
  }

  if (reasonPrompt && open) {
    return (
      <form onSubmit={submit} className="basis-full rounded-md border border-line bg-canvas p-2.5">
        <label className="field-label text-2xs">{reasonPrompt}</label>
        <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className="field-input text-xs" autoFocus />
        {error && <p className="field-error">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant={variant === "secondary" ? "primary" : variant} disabled={busy}>
            {busy ? "Working…" : label}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <span className="inline-flex flex-col">
      <Button size="sm" variant={variant} icon={icon} disabled={busy} onClick={() => (reasonPrompt ? setOpen(true) : void run())}>
        {busy ? "Working…" : label}
      </Button>
      {error && (
        <span className="mt-1 max-w-[16rem] text-2xs text-bad" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

export { send as sendAdminRequest };
