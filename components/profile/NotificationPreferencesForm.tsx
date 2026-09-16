"use client";

import { useState } from "react";
import { api } from "@/lib/api/client";
import type { NotificationPreferences } from "@/types";
import { ErrorState } from "@/components/ui/States";

const TOGGLES: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "replies", label: "Replies", description: "Someone replies to your discussion or your answer is accepted." },
  { key: "mentions", label: "Mentions", description: "A member mentions you by handle." },
  { key: "followedDiscussions", label: "Followed discussions", description: "New activity on discussions you follow." },
  { key: "followedTopics", label: "Followed topics", description: "New discussions in topics you follow (e.g. EMIR, UTI, DTCC)." },
  { key: "regulatoryUpdates", label: "Regulatory updates", description: "New updates from regulators and sources you follow." },
  { key: "knowledgeArticles", label: "Knowledge Base articles", description: "New or updated articles in topics you follow." },
  { key: "challenges", label: "Challenges", description: "The daily challenge and new challenge sets." },
  { key: "adminAnnouncements", label: "Admin announcements", description: "Site-wide announcements from the RegWorld team." },
];

export function NotificationPreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState<keyof NotificationPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(key: keyof NotificationPreferences, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaving(key);
    setError(null);
    try {
      await api.updateNotificationPreferences({ [key]: value });
    } catch (err) {
      setPrefs((p) => ({ ...p, [key]: !value }));
      setError(err instanceof Error ? err.message : "Could not save your preference.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      {error && <ErrorState title="Not saved" description={error} />}
      <fieldset className="divide-y divide-line rounded-md border border-line">
        {TOGGLES.map((t) => (
          <label key={t.key} className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-ink">{t.label}</span>
              <span className="block text-xs text-muted">{t.description}</span>
            </span>
            <input
              type="checkbox"
              checked={prefs[t.key] as boolean}
              disabled={saving === t.key}
              onChange={(e) => toggle(t.key, e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              aria-label={t.label}
            />
          </label>
        ))}
      </fieldset>
      <fieldset className="rounded-md border border-line px-4 py-3">
        <label className="flex cursor-pointer items-start justify-between gap-4">
          <span>
            <span className="block text-sm font-medium text-ink">Weekly email digest</span>
            <span className="block text-xs text-muted">A weekly summary email in addition to in-app notifications. Delivered via RegWorld's existing email system.</span>
          </span>
          <input
            type="checkbox"
            checked={prefs.emailDigest}
            disabled={saving === "emailDigest"}
            onChange={(e) => toggle("emailDigest", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
            aria-label="Weekly email digest"
          />
        </label>
      </fieldset>
      <p className="text-2xs text-muted">Changes save automatically. In-app delivery only — WhatsApp delivery is not yet available.</p>
    </div>
  );
}
