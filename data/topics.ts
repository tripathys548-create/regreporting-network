import type { Topic, TopicSlug } from "@/types";

export const TOPICS: Topic[] = [
  { slug: "emir", label: "EMIR", kind: "regulation", jurisdiction: "EU", description: "EU derivatives reporting under EMIR, including the REFIT reporting framework." },
  { slug: "uk-emir", label: "UK EMIR", kind: "regulation", jurisdiction: "UK", description: "The onshored UK derivatives reporting regime supervised by the FCA." },
  { slug: "sftr", label: "SFTR", kind: "regulation", jurisdiction: "EU", description: "Securities financing transaction reporting in the EU and UK." },
  { slug: "cftc", label: "CFTC", kind: "regulation", jurisdiction: "US", description: "US swap data reporting to swap data repositories under CFTC rules." },
  { slug: "sec", label: "SEC", kind: "regulation", jurisdiction: "US", description: "US security-based swap reporting under SEC Regulation SBSR." },
  { slug: "mifir", label: "MiFIR", kind: "regulation", jurisdiction: "EU", description: "Transaction reporting to national competent authorities under MiFIR." },
  { slug: "uti", label: "UTI", kind: "identifier", jurisdiction: "Global", description: "Unique Transaction Identifier generation, sharing and pairing." },
  { slug: "upi", label: "UPI", kind: "identifier", jurisdiction: "Global", description: "Unique Product Identifier for OTC derivatives products." },
  { slug: "lei", label: "LEI", kind: "identifier", jurisdiction: "Global", description: "Legal Entity Identifier issuance, renewal and validation." },
  { slug: "trade-repository", label: "Trade Repository", kind: "infrastructure", description: "Submission, validation feedback and reconciliation at trade repositories." },
  { slug: "dtcc", label: "DTCC", kind: "infrastructure", description: "DTCC Global Trade Repository services and technical specifications." },
  { slug: "isda-cdm", label: "ISDA CDM", kind: "infrastructure", description: "ISDA Common Domain Model and Digital Regulatory Reporting." },
  { slug: "iso-20022", label: "ISO 20022", kind: "infrastructure", description: "ISO 20022 XML messaging used for regulatory reporting submissions." },
  { slug: "data-quality", label: "Data Quality", kind: "discipline", description: "Completeness, accuracy, timeliness and reconciliation controls." },
  { slug: "operations", label: "Operations", kind: "discipline", description: "Day-to-day reporting operations, exception handling and remediation." },
  { slug: "technology", label: "Technology", kind: "discipline", description: "Reporting architecture, data lineage and vendor solutions." },
  { slug: "regulatory-change", label: "Regulatory Change", kind: "discipline", description: "Impact analysis, implementation programmes and change governance." },
];

const TOPIC_MAP = new Map(TOPICS.map((t) => [t.slug, t]));

export function getTopic(slug: TopicSlug): Topic {
  const topic = TOPIC_MAP.get(slug);
  if (!topic) throw new Error(`Unknown topic: ${slug}`);
  return topic;
}

export function topicLabel(slug: TopicSlug): string {
  return TOPIC_MAP.get(slug)?.label ?? slug;
}

export function isTopicSlug(value: string): value is TopicSlug {
  return TOPIC_MAP.has(value as TopicSlug);
}

/** Category filters shown on the Community page, in display order. */
export const COMMUNITY_CATEGORIES: TopicSlug[] = [
  "emir",
  "uk-emir",
  "sftr",
  "cftc",
  "sec",
  "uti",
  "upi",
  "lei",
  "trade-repository",
  "dtcc",
  "isda-cdm",
  "data-quality",
  "operations",
  "technology",
  "regulatory-change",
];
