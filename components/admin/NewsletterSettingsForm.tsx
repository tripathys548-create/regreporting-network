"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { NewsletterSettings } from "@/types";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { sendAdminRequest } from "./AdminAction";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function NewsletterSettingsForm({ settings, isAdmin }: { settings: NewsletterSettings; isAdmin: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [sendDay, setSendDay] = useState(settings.sendDay);
  const [sendTime, setSendTime] = useState(settings.sendTime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await sendAdminRequest("/api/admin/newsletter/settings", "POST", { enabled, sendDay, sendTime });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setBusy(false);
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-xs text-muted">
        Automatic weekly sending is currently <span className="font-semibold text-ink">{settings.enabled ? "enabled" : "disabled"}</span> ({DAYS[settings.sendDay]} at {settings.sendTime} UTC). Only
        admins can change this.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex items-center gap-2 text-xs font-medium text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setSaved(false);
          }}
          className="h-3.5 w-3.5 accent-accent"
        />
        Enable automatic weekly sending
      </label>
      <div>
        <label className="field-label text-2xs">Send day</label>
        <select
          value={sendDay}
          onChange={(e) => {
            setSendDay(Number(e.target.value));
            setSaved(false);
          }}
          className="field-input h-8 py-1 text-xs"
        >
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label text-2xs">Send time (UTC)</label>
        <input
          type="time"
          value={sendTime}
          onChange={(e) => {
            setSendTime(e.target.value);
            setSaved(false);
          }}
          className="field-input h-8 text-xs"
        />
      </div>
      <Button size="sm" variant="primary" disabled={busy} onClick={save}>
        {busy ? "Saving…" : saved ? "Saved" : "Save"}
      </Button>
      {error && <ErrorState className="basis-full" description={error} />}
      <p className="basis-full text-2xs text-muted">
        Requires a cron job calling <code className="font-mono">npm run newsletter:dispatch</code> on the server (hourly is a good default) — see docs/EMAIL_AND_NEWSLETTER.md. Nothing sends
        automatically until that's scheduled and this toggle is on.
      </p>
    </div>
  );
}
