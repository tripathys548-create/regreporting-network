"use client";

import clsx from "clsx";
import { TOPICS } from "@/data/topics";
import { ORGANISATION_TYPES } from "@/lib/constants";
import type { TopicSlug } from "@/types";
import { Field } from "./Field";

export interface ProfileFieldValues {
  displayName: string;
  jobTitle: string;
  organisationName: string;
  organisationType: string;
  yearsExperience: string;
  location: string;
  expertise: TopicSlug[];
}

export const EMPTY_PROFILE_VALUES: ProfileFieldValues = {
  displayName: "",
  jobTitle: "",
  organisationName: "",
  organisationType: "",
  yearsExperience: "",
  location: "",
  expertise: [],
};

interface ProfileFieldsProps {
  values: ProfileFieldValues;
  errors: Partial<Record<string, string>>;
  onChange: (patch: Partial<ProfileFieldValues>) => void;
  /** Name is rendered separately on sign-up (grouped with account details). */
  includeName?: boolean;
}

export function NameField({ value, error, onChange }: { value: string; error?: string; onChange: (v: string) => void }) {
  return (
    <Field id="displayName" label="Full name" error={error} hint="Shown on your profile and posts.">
      <input id="displayName" autoComplete="name" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? "true" : undefined} aria-describedby="displayName-help" className="field-input" />
    </Field>
  );
}

/** Professional details collected at sign-up and editable later. */
export function ProfileFields({ values, errors, onChange, includeName = true }: ProfileFieldsProps) {
  const toggleExpertise = (slug: TopicSlug) =>
    onChange({ expertise: values.expertise.includes(slug) ? values.expertise.filter((s) => s !== slug) : [...values.expertise, slug].slice(0, 8) });

  return (
    <div className="space-y-4">
      {includeName && <NameField value={values.displayName} error={errors.displayName} onChange={(displayName) => onChange({ displayName })} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="organisationName" label="Organisation you work for" error={errors.organisationName} hint="e.g. the bank, fund, TR or firm you work at.">
          <input
            id="organisationName"
            autoComplete="organization"
            value={values.organisationName}
            onChange={(e) => onChange({ organisationName: e.target.value })}
            aria-invalid={errors.organisationName ? "true" : undefined}
            aria-describedby="organisationName-help"
            className="field-input"
          />
        </Field>
        <Field id="organisationType" label="Organisation type" error={errors.organisationType}>
          <select
            id="organisationType"
            value={values.organisationType}
            onChange={(e) => onChange({ organisationType: e.target.value })}
            aria-invalid={errors.organisationType ? "true" : undefined}
            className="field-input"
          >
            <option value="">Select…</option>
            {ORGANISATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field id="jobTitle" label="Role / job title" error={errors.jobTitle}>
          <input
            id="jobTitle"
            autoComplete="organization-title"
            value={values.jobTitle}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
            aria-invalid={errors.jobTitle ? "true" : undefined}
            placeholder="e.g. Regulatory Reporting Analyst"
            className="field-input"
          />
        </Field>
        <Field id="yearsExperience" label="Years of experience" error={errors.yearsExperience} hint="In regulatory reporting or related roles.">
          <input
            id="yearsExperience"
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            value={values.yearsExperience}
            onChange={(e) => onChange({ yearsExperience: e.target.value })}
            aria-invalid={errors.yearsExperience ? "true" : undefined}
            aria-describedby="yearsExperience-help"
            className="field-input"
          />
        </Field>
        <Field id="location" label="Location" optional error={errors.location}>
          <input id="location" autoComplete="address-level2" value={values.location} onChange={(e) => onChange({ location: e.target.value })} placeholder="e.g. London" className="field-input" />
        </Field>
      </div>

      <fieldset>
        <legend className="field-label">
          Areas of expertise <span className="font-normal text-muted">(optional, up to 8)</span>
        </legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {TOPICS.map((t) => {
            const selected = values.expertise.includes(t.slug);
            return (
              <button
                key={t.slug}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleExpertise(t.slug)}
                className={clsx(
                  "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                  selected ? "border-navy bg-navy text-white" : "border-line bg-surface text-body hover:border-muted/40",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
