"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SOURCES } from "@/data/sources";
import { TOPICS } from "@/data/topics";
import type { TopicSlug, UpdateSeverity } from "@/types";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { sendAdminRequest } from "./AdminAction";

export interface EditableUpdate {
  id: string;
  title: string;
  summary: string;
  category: TopicSlug;
  topics: TopicSlug[];
  severity: UpdateSeverity;
  isAlert: boolean;
  status: string;
}

function TopicPicker({ value, onChange }: { value: TopicSlug[]; onChange: (v: TopicSlug[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {TOPICS.map((t) => {
        const on = value.includes(t.slug);
        return (
          <button
            key={t.slug}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== t.slug) : [...value, t.slug].slice(0, 6))}
            className={clsx("rounded border px-1.5 py-0.5 text-2xs font-medium", on ? "border-navy bg-navy text-white" : "border-line bg-surface text-body")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function CommonFields({
  title,
  summary,
  category,
  topics,
  severity,
  set,
}: {
  title: string;
  summary: string;
  category: string;
  topics: TopicSlug[];
  severity: UpdateSeverity;
  set: (patch: Partial<{ title: string; summary: string; category: string; topics: TopicSlug[]; severity: UpdateSeverity }>) => void;
}) {
  return (
    <>
      <div>
        <label className="field-label text-2xs">Title</label>
        <input value={title} maxLength={300} onChange={(e) => set({ title: e.target.value })} className="field-input text-xs" />
      </div>
      <div>
        <label className="field-label text-2xs">Summary (neutral, factual — link to the source for detail)</label>
        <textarea rows={3} maxLength={1200} value={summary} onChange={(e) => set({ summary: e.target.value })} className="field-input text-xs" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="field-label text-2xs">Category</label>
          <select value={category} onChange={(e) => set({ category: e.target.value })} className="field-input py-1.5 text-xs">
            {TOPICS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label text-2xs">Severity</label>
          <select value={severity} onChange={(e) => set({ severity: e.target.value as UpdateSeverity })} className="field-input py-1.5 text-xs">
            <option value="standard">Standard</option>
            <option value="high">High impact</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>
      <div>
        <label className="field-label text-2xs">Topics</label>
        <TopicPicker value={topics} onChange={(v) => set({ topics: v })} />
      </div>
    </>
  );
}

export function UpdateEditor({ update, onClose }: { update: EditableUpdate; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({ title: update.title, summary: update.summary, category: update.category as string, topics: update.topics, severity: update.severity, isAlert: update.isAlert });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendAdminRequest(`/api/admin/updates/${update.id}`, "PATCH", form);
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2.5 rounded-md border border-line bg-canvas p-3">
      {error && <ErrorState title="Not saved" description={error} />}
      <CommonFields {...form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      <label className={clsx("flex items-center gap-2 text-xs", update.status !== "published" && "text-muted")}>
        <input type="checkbox" checked={form.isAlert} disabled={update.status !== "published"} onChange={(e) => setForm((f) => ({ ...f, isAlert: e.target.checked }))} className="accent-accent" />
        Show in the regulatory alert banner {update.status !== "published" && "(publish first)"}
      </label>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

export function EditUpdateToggle({ update }: { update: EditableUpdate }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="basis-full">
      <UpdateEditor update={update} onClose={() => setOpen(false)} />
    </div>
  ) : (
    <Button size="sm" variant="ghost" icon="settings" onClick={() => setOpen(true)}>
      Edit
    </Button>
  );
}

/** Manual entry for sources without a feed (e.g. DTCC). */
export function ManualUpdateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ sourceId: "src-dtcc", originalUrl: "", publishedAt: "", title: "", summary: "", category: "trade-repository", topics: [] as TopicSlug[], severity: "standard" as UpdateSeverity });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendAdminRequest("/api/admin/updates", "POST", form);
      setOpen(false);
      setForm((f) => ({ ...f, originalUrl: "", publishedAt: "", title: "", summary: "", topics: [] }));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the update.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" icon="plus" onClick={() => setOpen(true)}>
        Add update manually
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2.5 rounded-md border border-line bg-canvas p-3">
      <p className="text-xs font-semibold text-ink">Add an update from an official page</p>
      {error && <ErrorState title="Not added" description={error} />}
      <div className="grid gap-2 sm:grid-cols-[10rem_1fr_9rem]">
        <div>
          <label className="field-label text-2xs">Source</label>
          <select value={form.sourceId} onChange={(e) => setForm((f) => ({ ...f, sourceId: e.target.value }))} className="field-input py-1.5 text-xs">
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label text-2xs">Official link (must be on the source&apos;s domain)</label>
          <input type="url" value={form.originalUrl} onChange={(e) => setForm((f) => ({ ...f, originalUrl: e.target.value }))} placeholder="https://www.dtcc.com/…" className="field-input text-xs" />
        </div>
        <div>
          <label className="field-label text-2xs">Published</label>
          <input type="date" value={form.publishedAt} onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))} className="field-input py-1.5 text-xs" />
        </div>
      </div>
      <CommonFields {...form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="primary" disabled={busy}>
          {busy ? "Adding…" : "Add to review queue"}
        </Button>
      </div>
    </form>
  );
}
