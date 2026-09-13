"use client";

import { useState, type FormEvent } from "react";
import { api, goToSignIn } from "@/lib/api/client";
import { REPORT_REASONS } from "@/lib/validation";
import type { ReportReason, ViewerStatus } from "@/types";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Report link plus an inline form. Renders as a fragment so, inside a
 * flex-wrap row, the form breaks onto its own full-width line.
 */
export function ReportButton({ targetType, targetId, viewerStatus }: { targetType: "discussion" | "comment" | "profile"; targetId: string; viewerStatus: ViewerStatus }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("misleading-regulatory-claim");
  const [detail, setDetail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-2xs text-muted" role="status">
        <Icon name="check" className="h-3 w-3" />
        Reported — moderators will review
      </span>
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    try {
      await api.report({ targetType, targetId, reason, detail });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report.");
      setState("error");
    }
  }

  const formId = `report-${targetType}-${targetId}`;
  return (
    <>
      <button
        type="button"
        onClick={() => (viewerStatus === "signed-out" ? goToSignIn() : setOpen((v) => !v))}
        aria-expanded={open}
        aria-controls={formId}
        className="inline-flex items-center gap-1 text-2xs text-muted hover:text-bad"
      >
        <Icon name="flag" className="h-3 w-3" />
        Report
      </button>
      {open && (
        <form id={formId} onSubmit={submit} className="basis-full rounded-md border border-line bg-canvas p-3">
          <label htmlFor={`${formId}-reason`} className="field-label">
            Why are you reporting this?
          </label>
          <select id={`${formId}-reason`} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} className="field-input py-1.5 text-xs">
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <label htmlFor={`${formId}-detail`} className="field-label mt-2">
            Details <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea id={`${formId}-detail`} rows={2} maxLength={500} value={detail} onChange={(e) => setDetail(e.target.value)} className="field-input text-xs" />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send report"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
