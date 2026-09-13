"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { sendAdminRequest } from "./AdminAction";

interface RunResult {
  feedId: string;
  status: string;
  fetched: number;
  pending: number;
  archived: number;
  duplicates: number;
  skippedOld: number;
  rejected: number;
  error: string | null;
}

export function RunIngestionButton({ feedId, label = "Fetch all feeds now" }: { feedId?: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const data = (await sendAdminRequest("/api/admin/ingest", "POST", feedId ? { feedId } : {})) as { results?: RunResult[] };
      const results = data.results ?? [];
      const pending = results.reduce((n, r) => n + r.pending, 0);
      const failed = results.filter((r) => r.status === "error");
      setSummary(`${pending} new item${pending === 1 ? "" : "s"} for review${failed.length ? ` · ${failed.length} feed${failed.length === 1 ? "" : "s"} failed` : ""}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ingestion failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button size="sm" variant={feedId ? "ghost" : "primary"} icon="refresh" onClick={run} disabled={busy}>
        {busy ? "Fetching…" : label}
      </Button>
      {summary && (
        <span className="text-2xs text-good" role="status">
          {summary}
        </span>
      )}
      {error && (
        <span className="text-2xs text-bad" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
