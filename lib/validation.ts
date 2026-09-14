import { isTopicSlug } from "@/data/topics";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/auth/limits";
import { ORGANISATION_TYPES } from "@/lib/constants";
import type { NewCommentInput, NewDiscussionInput, OrganisationType, ProfileUpdateInput, ReportReason, SignupInput, TopicSlug } from "@/types";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors<T> };

export const DISCUSSION_LIMITS = {
  titleMin: 15,
  titleMax: 160,
  bodyMin: 30,
  bodyMax: 5000,
  maxTags: 5,
  tagMax: 32,
} as const;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Shared by the client form and the API route so both enforce identical rules. */
export function validateNewDiscussion(input: unknown): ValidationResult<NewDiscussionInput> {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const errors: FieldErrors<NewDiscussionInput> = {};
  const L = DISCUSSION_LIMITS;

  const title = asString(raw.title);
  if (title.length < L.titleMin) errors.title = `Title must be at least ${L.titleMin} characters.`;
  else if (title.length > L.titleMax) errors.title = `Title must be ${L.titleMax} characters or fewer.`;

  const body = asString(raw.body);
  if (body.length < L.bodyMin) errors.body = `Describe the question in at least ${L.bodyMin} characters.`;
  else if (body.length > L.bodyMax) errors.body = `Keep the description under ${L.bodyMax} characters.`;

  const category = asString(raw.category);
  if (!isTopicSlug(category)) errors.category = "Choose a category.";

  const rawTags = Array.isArray(raw.tags) ? raw.tags : [];
  const tags = Array.from(new Set(rawTags.map(asString).filter(Boolean)));
  if (tags.length > L.maxTags) errors.tags = `Use up to ${L.maxTags} tags.`;
  else if (tags.some((t) => t.length > L.tagMax)) errors.tags = `Each tag must be ${L.tagMax} characters or fewer.`;

  if (Object.keys(errors).length > 0 || !isTopicSlug(category)) return { ok: false, errors };

  const linked = asString(raw.linkedChatSessionId);
  return { ok: true, value: { title, body, category, tags, linkedChatSessionId: linked || null } };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function parseYears(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 0 && n <= 60 ? n : null;
}

function parseExpertise(value: unknown): TopicSlug[] {
  return Array.isArray(value) ? Array.from(new Set(value.filter((v): v is TopicSlug => typeof v === "string" && isTopicSlug(v)))).slice(0, 8) : [];
}

/** Profile fields shared by sign-up and profile editing. */
function validateProfileFields(raw: Record<string, unknown>, errors: Record<string, string>) {
  const displayName = asString(raw.displayName);
  if (displayName.length < 2 || displayName.length > 80) errors.displayName = "Enter your full name (2–80 characters).";

  const jobTitle = asString(raw.jobTitle);
  if (jobTitle.length < 2 || jobTitle.length > 80) errors.jobTitle = "Enter your role or job title.";

  const organisationName = asString(raw.organisationName);
  if (organisationName.length < 2 || organisationName.length > 120) errors.organisationName = "Enter the organisation you work for.";

  const organisationType = asString(raw.organisationType);
  if (!(ORGANISATION_TYPES as readonly string[]).includes(organisationType)) errors.organisationType = "Choose an organisation type.";

  const yearsExperience = parseYears(raw.yearsExperience);
  if (yearsExperience === null) errors.yearsExperience = "Enter your years of experience (0–60).";

  const location = asString(raw.location);
  if (location.length > 80) errors.location = "Keep location under 80 characters.";

  return {
    displayName,
    jobTitle,
    organisationName,
    organisationType: organisationType as OrganisationType,
    yearsExperience: yearsExperience ?? 0,
    location,
    expertise: parseExpertise(raw.expertise),
  };
}

const toRecord = (input: unknown) => (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;

export function validateSignup(input: unknown): ValidationResult<SignupInput> {
  const raw = toRecord(input);
  const errors: Record<string, string> = {};
  const profile = validateProfileFields(raw, errors);

  const email = asString(raw.email).toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = "Enter a valid work email address.";

  const password = typeof raw.password === "string" ? raw.password : "";
  if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  else if (password.length > PASSWORD_MAX_LENGTH) errors.password = `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  else if (password.toLowerCase() === email) errors.password = "Password must not be your email address.";

  if (raw.acceptGuidelines !== true) (errors as Record<string, string>).acceptGuidelines = "You must accept the community standards.";

  if (Object.keys(errors).length > 0) return { ok: false, errors: errors as FieldErrors<SignupInput> };
  return { ok: true, value: { ...profile, email, password, newsletterOptIn: raw.newsletterOptIn === true } };
}

export function validateLogin(input: unknown): ValidationResult<{ email: string; password: string }> {
  const raw = toRecord(input);
  const email = asString(raw.email).toLowerCase();
  const password = typeof raw.password === "string" ? raw.password : "";
  const errors: FieldErrors<{ email: string; password: string }> = {};
  if (!email) errors.email = "Enter your email address.";
  if (!password) errors.password = "Enter your password.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { email, password } };
}

export function validateProfileUpdate(input: unknown): ValidationResult<ProfileUpdateInput> {
  const raw = toRecord(input);
  const errors: Record<string, string> = {};
  const profile = validateProfileFields(raw, errors);
  const bio = asString(raw.bio);
  if (bio.length > 600) errors.bio = "Keep your bio under 600 characters.";
  if (Object.keys(errors).length > 0) return { ok: false, errors: errors as FieldErrors<ProfileUpdateInput> };
  return { ok: true, value: { ...profile, bio } };
}

export const COMMENT_LIMITS = { min: 20, max: 5000 } as const;

export function validateComment(input: unknown): ValidationResult<NewCommentInput> {
  const raw = toRecord(input);
  const body = asString(raw.body);
  const parentId = asString(raw.parentId) || null;
  if (body.length < COMMENT_LIMITS.min) return { ok: false, errors: { body: `Replies need at least ${COMMENT_LIMITS.min} characters.` } };
  if (body.length > COMMENT_LIMITS.max) return { ok: false, errors: { body: `Keep replies under ${COMMENT_LIMITS.max} characters.` } };
  return { ok: true, value: { body, parentId } };
}

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "misleading-regulatory-claim", label: "Misleading regulatory claim" },
  { value: "confidential-data", label: "Contains confidential data" },
  { value: "spam", label: "Spam or promotion" },
  { value: "abuse", label: "Abusive or unprofessional" },
  { value: "off-topic", label: "Off-topic" },
];

export function validateReport(input: unknown): ValidationResult<{ targetType: "discussion" | "comment" | "profile"; targetId: string; reason: ReportReason; detail: string }> {
  const raw = toRecord(input);
  const targetType = asString(raw.targetType);
  const targetId = asString(raw.targetId);
  const reason = asString(raw.reason);
  const detail = asString(raw.detail).slice(0, 500);
  if (!["discussion", "comment", "profile"].includes(targetType) || !targetId) return { ok: false, errors: { targetId: "Unknown content." } };
  if (!REPORT_REASONS.some((r) => r.value === reason)) return { ok: false, errors: { reason: "Choose a reason." } };
  return { ok: true, value: { targetType: targetType as "discussion" | "comment" | "profile", targetId, reason: reason as ReportReason, detail } };
}

export function parseTagInput(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
