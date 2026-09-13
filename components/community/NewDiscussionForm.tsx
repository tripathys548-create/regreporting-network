"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { COMMUNITY_CATEGORIES, topicLabel } from "@/data/topics";
import { api, ApiError } from "@/lib/api/client";
import { DISCUSSION_LIMITS, parseTagInput, validateNewDiscussion, type FieldErrors } from "@/lib/validation";
import type { NewDiscussionInput, TopicSlug } from "@/types";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { Icon } from "@/components/ui/Icon";

interface NewDiscussionFormProps {
  initialTitle?: string;
  initialCategory?: TopicSlug;
  fromRegBot?: boolean;
}

export function NewDiscussionForm({ initialTitle = "", initialCategory, fromRegBot }: NewDiscussionFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>(initialCategory ?? "");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<FieldErrors<NewDiscussionInput>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    // A RegBot escalation is recorded by its origin; the chat itself is not stored in Phase 2.
    const candidate = { title, body, category, tags: parseTagInput(tags), linkedChatSessionId: fromRegBot ? "regbot" : null };
    const result = validateNewDiscussion(candidate);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.createDiscussion(result.value);
      router.push(`/community/${res.slug}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details) setErrors(err.details as FieldErrors<NewDiscussionInput>);
      setSubmitError(err instanceof Error ? err.message : "Could not publish your discussion.");
      setSubmitting(false);
    }
  }

  const L = DISCUSSION_LIMITS;
  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {fromRegBot && (
        <div className="flex gap-2 rounded-md border border-accent/25 bg-accent-soft px-3 py-2.5 text-xs text-accent-strong">
          <Icon name="bot" className="mt-0.5" />
          <p>Pre-filled from your RegBot question. Add what the RegBot answer did not resolve so practitioners can focus on the implementation detail.</p>
        </div>
      )}
      {submitError && <ErrorState title="Not published" description={submitError} />}

      <div>
        <label htmlFor="d-title" className="field-label">
          Question title
        </label>
        <input
          id="d-title"
          value={title}
          maxLength={L.titleMax}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={errors.title ? "true" : undefined}
          aria-describedby="d-title-help"
          className="field-input"
          placeholder="e.g. How are firms handling UTI pairing breaks after novations?"
        />
        <p id="d-title-help" className={errors.title ? "field-error" : "mt-1 text-2xs text-muted"}>
          {errors.title ?? `Be specific: regime, event type or field. ${title.trim().length}/${L.titleMax}`}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="d-category" className="field-label">
            Category
          </label>
          <select id="d-category" value={category} onChange={(e) => setCategory(e.target.value)} aria-invalid={errors.category ? "true" : undefined} className="field-input">
            <option value="">Select a category…</option>
            {COMMUNITY_CATEGORIES.map((slug) => (
              <option key={slug} value={slug}>
                {topicLabel(slug)}
              </option>
            ))}
          </select>
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>
        <div>
          <label htmlFor="d-tags" className="field-label">
            Tags <span className="font-normal text-muted">(comma separated, up to {L.maxTags})</span>
          </label>
          <input id="d-tags" value={tags} onChange={(e) => setTags(e.target.value)} aria-invalid={errors.tags ? "true" : undefined} className="field-input" placeholder="UTI, Lifecycle Events, Reconciliation" />
          {errors.tags && <p className="field-error">{errors.tags}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="d-body" className="field-label">
          Details
        </label>
        <textarea
          id="d-body"
          rows={8}
          value={body}
          maxLength={L.bodyMax}
          onChange={(e) => setBody(e.target.value)}
          aria-invalid={errors.body ? "true" : undefined}
          aria-describedby="d-body-help"
          className="field-input resize-y"
          placeholder="Describe the scenario, what you have tried, and which sources you have already checked."
        />
        <p id="d-body-help" className={errors.body ? "field-error" : "mt-1 text-2xs text-muted"}>
          {errors.body ?? "Never include client names, LEIs of real counterparties, UTIs or other confidential data."}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-2xs text-muted">
          <Icon name="shield" className="h-3.5 w-3.5" />
          Published immediately. Members can report content for moderator review.
        </p>
        <div className="flex gap-2">
          <ButtonLink href="/community" variant="ghost">
            Cancel
          </ButtonLink>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish discussion"}
          </Button>
        </div>
      </div>
    </form>
  );
}
