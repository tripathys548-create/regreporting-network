"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";

const CATEGORIES = [
  { value: "feature", label: "Feature idea" },
  { value: "bug", label: "Bug report" },
  { value: "security", label: "Security" },
  { value: "content", label: "Content / data issue" },
  { value: "other", label: "Other" },
] as const;

const PRIORITIES = ["low", "normal", "high"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

/**
 * 💡 Suggest an Improvement. When category = "security", shows a warning not
 * to include secrets, and asks for the extra fields a security report needs
 * (steps to reproduce, severity). For an actual vulnerability disclosure,
 * this form still routes to the admin queue — /security explains the fuller
 * responsible-disclosure process for anyone who needs it.
 */
export function SuggestionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("feature");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>("normal");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("medium");
  const [relatedPage, setRelatedPage] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isSecurity = category === "security";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          relatedPage,
          screenshotUrl: screenshotUrl || null,
          severity: isSecurity ? severity : null,
          stepsToReproduce,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not submit your suggestion.");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your suggestion.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-md border border-good/30 bg-good-soft px-4 py-6 text-center text-sm text-good">
        <Icon name="check" className="mx-auto mb-2 h-6 w-6" />
        Thank you — your suggestion has been sent to the admin team.
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {error && <ErrorState title="Not submitted" description={error} />}

      <div>
        <label htmlFor="s-category" className="field-label">
          Category
        </label>
        <select id="s-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="field-input">
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {isSecurity && (
        <div className="flex gap-2 rounded-md border border-signal/30 bg-signal-soft px-3 py-2.5 text-xs text-signal">
          <Icon name="shield" className="mt-0.5" />
          <p>
            Please do not include passwords, API keys, personal credentials, or other secrets in this report. For sensitive vulnerabilities, see{" "}
            <a href="/security" className="underline">
              /security
            </a>{" "}
            for the responsible-disclosure process instead.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="s-title" className="field-label">
          Title
        </label>
        <input id="s-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className="field-input" placeholder="Short summary" />
      </div>

      <div>
        <label htmlFor="s-description" className="field-label">
          Description
        </label>
        <textarea
          id="s-description"
          rows={5}
          value={description}
          maxLength={3000}
          onChange={(e) => setDescription(e.target.value)}
          className="field-input resize-y"
          placeholder={isSecurity ? "What did you find, and where?" : "What would you like to see, or what went wrong?"}
        />
      </div>

      {isSecurity && (
        <>
          <div>
            <label htmlFor="s-steps" className="field-label">
              Steps to reproduce
            </label>
            <textarea id="s-steps" rows={4} value={stepsToReproduce} maxLength={2000} onChange={(e) => setStepsToReproduce(e.target.value)} className="field-input resize-y" />
          </div>
          <div>
            <label htmlFor="s-severity" className="field-label">
              Severity
            </label>
            <select id="s-severity" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)} className="field-input">
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="s-page" className="field-label">
            Affected page <span className="font-normal text-muted">(optional)</span>
          </label>
          <input id="s-page" value={relatedPage} maxLength={300} onChange={(e) => setRelatedPage(e.target.value)} className="field-input" placeholder="/community/…" />
        </div>
        {!isSecurity && (
          <div>
            <label htmlFor="s-priority" className="field-label">
              Priority
            </label>
            <select id="s-priority" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="field-input">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="s-screenshot" className="field-label">
          Screenshot URL <span className="font-normal text-muted">(optional)</span>
        </label>
        <input id="s-screenshot" value={screenshotUrl} maxLength={500} onChange={(e) => setScreenshotUrl(e.target.value)} className="field-input" placeholder="https://…" />
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <ButtonLink href="/" variant="ghost">
          Cancel
        </ButtonLink>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit suggestion"}
        </Button>
      </div>
    </form>
  );
}
