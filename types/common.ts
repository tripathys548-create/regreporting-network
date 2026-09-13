/** Opaque identifier. Will map to a UUID/cuid primary key once a database is introduced. */
export type ID = string;

/** ISO-8601 date or date-time string. Stored as strings so data is serialisable across the server/client boundary. */
export type ISODateString = string;

export type Jurisdiction = "EU" | "UK" | "US" | "Global";

/**
 * Editorial lifecycle shared by every piece of published content.
 * Nothing user- or feed-generated should reach "published" without passing review.
 */
export type ContentStatus = "draft" | "pending-review" | "published" | "rejected" | "archived";

/**
 * How authoritative a statement is. The UI must always show this so that
 * community opinion is never presented as regulatory fact.
 */
export type SourceType =
  | "regulatory-requirement"
  | "industry-guidance"
  | "implementation-reference"
  | "community-interpretation";

/** Trusted-source priority used by RegBot ranking. 1 = regulators, 4 = community. */
export type SourceTier = 1 | 2 | 3 | 4;

export type TopicSlug =
  | "emir"
  | "uk-emir"
  | "sftr"
  | "cftc"
  | "sec"
  | "mifir"
  | "uti"
  | "upi"
  | "lei"
  | "trade-repository"
  | "dtcc"
  | "isda-cdm"
  | "iso-20022"
  | "data-quality"
  | "operations"
  | "technology"
  | "regulatory-change";

export type TopicKind = "regulation" | "identifier" | "infrastructure" | "discipline";

export interface Topic {
  slug: TopicSlug;
  label: string;
  kind: TopicKind;
  jurisdiction?: Jurisdiction;
  description: string;
}

/** Pointer into a SourceDocument, e.g. "Article 9(1)" or "Validation rule 2.1.4". */
export interface Citation {
  sourceDocumentId: ID;
  locator?: string;
  note?: string;
}

export type LoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; message: string };
