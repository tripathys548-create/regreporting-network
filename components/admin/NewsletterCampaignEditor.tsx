"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { NewsletterCampaign, NewsletterCampaignInput, NewsletterCampaignStats } from "@/types";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { sendAdminRequest } from "./AdminAction";

const FIELD_LABELS: { key: keyof NewsletterCampaignInput; label: string; rows?: number }[] = [
  { key: "title", label: "Newsletter title" },
  { key: "subject", label: "Subject line" },
  { key: "previewText", label: "Preview text" },
  { key: "introText", label: "Intro (This Week in Regulatory Reporting)", rows: 2 },
  { key: "radarHighlight", label: "1. Regulatory Radar — top developments", rows: 2 },
  { key: "knowledgeHighlight", label: "2. Reporting Insight", rows: 2 },
  { key: "challengeHighlight", label: "3. Daily Challenge — this week's highlight", rows: 2 },
  { key: "communityHighlight", label: "4. Community — interesting discussion", rows: 2 },
  { key: "milestoneHighlight", label: "5. Coming Up — deadlines / milestones", rows: 2 },
  { key: "ctaLabel", label: "CTA button label" },
  { key: "ctaUrl", label: "CTA link (path or full URL)" },
];

const EMPTY: NewsletterCampaignInput = {
  title: "",
  subject: "",
  previewText: "",
  introText: "",
  radarHighlight: "",
  knowledgeHighlight: "",
  challengeHighlight: "",
  communityHighlight: "",
  milestoneHighlight: "",
  ctaLabel: "Visit RegWorld",
  ctaUrl: "/",
};

function CampaignFields({ values, onChange }: { values: NewsletterCampaignInput; onChange: (patch: Partial<NewsletterCampaignInput>) => void }) {
  return (
    <div className="space-y-2.5">
      {FIELD_LABELS.map((f) => (
        <div key={f.key}>
          <label className="field-label text-2xs">{f.label}</label>
          {f.rows ? (
            <textarea rows={f.rows} maxLength={2000} value={values[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<NewsletterCampaignInput>)} className="field-input text-xs" />
          ) : (
            <input maxLength={200} value={values[f.key]} onChange={(e) => onChange({ [f.key]: e.target.value } as Partial<NewsletterCampaignInput>)} className="field-input text-xs" />
          )}
        </div>
      ))}
    </div>
  );
}

/** Create-new-draft form, collapsed behind a "Create newsletter" button. */
export function NewsletterComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<NewsletterCampaignInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendAdminRequest("/api/admin/newsletter/campaigns", "POST", values as unknown as Record<string, unknown>);
      setValues(EMPTY);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the draft.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)}>
        Create newsletter
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-line bg-canvas p-3">
      <CampaignFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
      {error && <ErrorState className="mt-2" description={error} />}
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}

const STATUS_TONE: Record<string, BadgeTone> = { draft: "outline", scheduled: "signal", sent: "good" };

/** One existing campaign: stats, inline edit, and the send/schedule actions. */
export function NewsletterCampaignRow({ campaign, stats, adminEmail }: { campaign: NewsletterCampaign; stats: NewsletterCampaignStats; adminEmail: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<NewsletterCampaignInput>(campaign);
  const [scheduledAt, setScheduledAt] = useState("");
  const [testEmail, setTestEmail] = useState(adminEmail);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: string, body: Record<string, unknown> = {}) {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      const result = (await sendAdminRequest(`/api/admin/newsletter/campaigns/${campaign.id}`, "PATCH", { action, ...body })) as { delivered?: boolean; sentCount?: number };
      if (action === "send-test") setNotice(result.delivered ? `Test sent to ${testEmail}.` : `Test queued to ${testEmail} — SMTP is not configured, so it was logged to /dev/mailbox instead of delivered.`);
      if (action === "send-now") setNotice(`Sent to ${result.sentCount} active subscriber(s).`);
      if (action === "save-draft") setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  const editable = campaign.status !== "sent";

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={STATUS_TONE[campaign.status] ?? "outline"}>{campaign.status}</Badge>
        <span className="text-sm font-semibold text-ink">{campaign.title || "(untitled)"}</span>
        {campaign.status === "sent" && (
          <span className="font-mono text-2xs text-muted">
            sent {stats.sent} · opened {stats.opened} · clicked {stats.clicked} · unsubscribed {stats.unsubscribed}
          </span>
        )}
        {campaign.status === "scheduled" && campaign.scheduledAt && <span className="text-2xs text-muted">scheduled for {new Date(campaign.scheduledAt).toUTCString()}</span>}
      </div>
      <p className="mt-0.5 text-xs text-muted">{campaign.subject}</p>

      {editing ? (
        <div className="mt-3">
          <CampaignFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" disabled={busy === "save-draft"} onClick={() => run("save-draft", values as unknown as Record<string, unknown>)}>
              {busy === "save-draft" ? "Saving…" : "Save draft"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {editable && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => window.open(`/api/admin/newsletter/campaigns/${campaign.id}/preview`, "_blank")}>
            Preview
          </Button>
          <span className="inline-flex items-center gap-1">
            <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="field-input h-8 w-44 text-2xs" placeholder="test recipient" />
            <Button size="sm" variant="secondary" disabled={busy === "send-test"} onClick={() => run("send-test", { toEmail: testEmail })}>
              {busy === "send-test" ? "Sending…" : "Send test"}
            </Button>
          </span>
          {editable && (
            <>
              <span className="inline-flex items-center gap-1">
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="field-input h-8 text-2xs" />
                <Button size="sm" variant="secondary" disabled={busy === "schedule" || !scheduledAt} onClick={() => run("schedule", { scheduledAt: new Date(scheduledAt).toISOString() })}>
                  Schedule
                </Button>
              </span>
              {campaign.status === "scheduled" && (
                <Button size="sm" variant="ghost" disabled={busy === "cancel-schedule"} onClick={() => run("cancel-schedule")}>
                  Cancel schedule
                </Button>
              )}
              <Button
                size="sm"
                variant="primary"
                disabled={busy === "send-now"}
                onClick={() => {
                  if (window.confirm(`Send "${campaign.title}" to every active subscriber now? This can't be undone.`)) void run("send-now");
                }}
              >
                {busy === "send-now" ? "Sending…" : "Send now"}
              </Button>
            </>
          )}
        </div>
      )}
      {notice && (
        <p className="mt-2 text-2xs text-good" role="status">
          {notice}
        </p>
      )}
      {error && <ErrorState className="mt-2" description={error} />}
    </li>
  );
}
