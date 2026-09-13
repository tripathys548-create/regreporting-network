import type { Citation, ContentStatus, ID, ISODateString, Jurisdiction, SourceTier, SourceType, TopicSlug } from "./common";

export type SourceSlug = "esma" | "fca" | "cftc" | "sec" | "bis" | "isda" | "dtcc" | "gleif" | "anna-dsb";

export interface RegulatorySource {
  id: ID;
  slug: SourceSlug;
  shortName: string;
  fullName: string;
  tier: SourceTier;
  sourceType: SourceType;
  jurisdiction: Jurisdiction;
  websiteUrl: string;
  /** Whether ingestion from this source is verified against an official domain. */
  verifiedDomain: boolean;
}

export type UpdateSeverity = "critical" | "high" | "standard";

export interface RegulatoryUpdate {
  id: ID;
  sourceId: ID;
  title: string;
  summary: string;
  category: TopicSlug;
  topics: TopicSlug[];
  jurisdiction: Jurisdiction;
  publishedAt: ISODateString;
  /** Link to the official page. Must be on the source's verified domain. */
  originalUrl: string;
  severity: UpdateSeverity;
  /** Promoted to the global RegulatoryAlertBanner when true. */
  isAlert: boolean;
  status: ContentStatus;
  /** True for sample content that does not describe a real publication. */
  isDemo: boolean;
}

export type DocumentType =
  | "regulation"
  | "technical-standard"
  | "guidelines"
  | "q-and-a"
  | "validation-rules"
  | "industry-guidance"
  | "technical-specification"
  | "consultation";

/** Payload for the global alert banner. Denormalised so the banner needs no extra lookups. */
export interface RegulatoryAlert {
  update: RegulatoryUpdate;
  sourceShortName: string;
}

export interface SourceDocument {
  id: ID;
  sourceId: ID;
  title: string;
  documentType: DocumentType;
  sourceType: SourceType;
  publishedAt: ISODateString;
  url: string;
  isDemo: boolean;
}

export type MilestoneType = "guidance" | "consultation-close" | "industry-testing" | "go-live" | "deadline";

export interface RegulatoryMilestone {
  id: ID;
  date: ISODateString;
  jurisdiction: Jurisdiction;
  regulation: TopicSlug;
  milestoneType: MilestoneType;
  title: string;
  requirement: string;
  sourceId: ID;
  citation?: Citation;
  officialUrl: string;
  isDemo: boolean;
}
