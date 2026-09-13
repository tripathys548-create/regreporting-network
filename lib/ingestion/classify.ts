import type { Jurisdiction, RegulatorySource, TopicSlug, UpdateSeverity } from "@/types";

/**
 * Deterministic relevance scoring for ingested items. It decides which items
 * reach the admin review queue — it never publishes anything by itself.
 *
 * Scoring: a topic term in the title scores 4, in the summary 2; general
 * reporting terms score 1 each (max 3). "Regulatory change" terms (consults,
 * guidelines, final rule…) are generic, so they count at most 2 and never
 * qualify an item on their own: an item needs a specific topic or at least two
 * general reporting terms. Items that do not qualify are auto-archived and
 * remain recoverable by an admin.
 */
export const RELEVANCE_THRESHOLD = 3;

interface TopicRule {
  terms: string[];
  /** Restricts terms that only make sense for certain jurisdictions. */
  jurisdictions?: Jurisdiction[];
}

const EU_UK: Jurisdiction[] = ["EU", "UK", "Global"];
const US: Jurisdiction[] = ["US", "Global"];

const TOPIC_RULES: Partial<Record<TopicSlug, TopicRule>> = {
  emir: { terms: ["emir", "refit", "european market infrastructure regulation", "bilateral margin", "central counterpart", "ccp"], jurisdictions: EU_UK },
  sftr: { terms: ["sftr", "securities financing"], jurisdictions: EU_UK },
  mifir: { terms: ["mifir", "mifid", "transaction reporting", "position reporting", "commodity derivatives"], jurisdictions: EU_UK },
  cftc: { terms: ["swap data", "swap dealer", "part 45", "part 43", "sdr", "swap execution", "clearing requirement"], jurisdictions: US },
  sec: { terms: ["security-based swap", "regulation sbsr", "sbsr"], jurisdictions: US },
  uti: { terms: ["uti", "unique transaction identifier"] },
  upi: { terms: ["upi", "unique product identifier"] },
  lei: { terms: ["lei", "legal entity identifier"] },
  "trade-repository": { terms: ["trade repositor", "data repositor"] },
  "iso-20022": { terms: ["iso 20022"] },
  "isda-cdm": { terms: ["common domain model", "cdm", "digital regulatory reporting"] },
  "data-quality": { terms: ["data quality", "reconciliation", "validation rules", "critical data element"] },
  "regulatory-change": { terms: ["consultation", "consults", "technical standards", "guidelines", "q&as", "final rule", "proposed rule"] },
};

const GENERAL_TERMS = ["reporting", "derivative", "derivatives", "swap", "swaps", "clearing", "margin", "trade data", "transparency", "supervisory data", "post-trade"];
const GENERIC_TOPIC: TopicSlug = "regulatory-change";
const GENERIC_CAP = 2;

const HIGH_SEVERITY = /\b(final rules?|go-live|goes live|deadline|enforcement action|fined|penalt(?:y|ies)|mandatory)\b/i;

function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Prefix terms (e.g. "trade repositor") match word starts; others match whole words, allowing a plural "s" (CCPs, LEIs).
  return term.endsWith("or") ? new RegExp(`\\b${escaped}`, "i") : new RegExp(`\\b${escaped}s?\\b`, "i");
}

const COMPILED = Object.entries(TOPIC_RULES).map(([topic, rule]) => ({
  topic: topic as TopicSlug,
  jurisdictions: rule!.jurisdictions,
  patterns: rule!.terms.map(termPattern),
}));
const GENERAL_PATTERNS = GENERAL_TERMS.map(termPattern);

export interface Classification {
  category: TopicSlug;
  topics: TopicSlug[];
  relevance: number;
  severity: UpdateSeverity;
}

export function classifyItem(item: { title: string; summary: string; categories?: string[] }, source: Pick<RegulatorySource, "jurisdiction" | "slug">): Classification {
  const title = item.title;
  const body = `${item.summary} ${(item.categories ?? []).join(" ")}`;
  const scores = new Map<TopicSlug, number>();

  for (const rule of COMPILED) {
    if (rule.jurisdictions && !rule.jurisdictions.includes(source.jurisdiction)) continue;
    let score = 0;
    for (const pattern of rule.patterns) {
      if (pattern.test(title)) score += 4;
      else if (pattern.test(body)) score += 2;
    }
    if (score > 0) scores.set(rule.topic, score);
  }

  // UK EMIR is the FCA's regime; the same terms from ESMA mean EU EMIR.
  if (source.slug === "fca" && scores.has("emir")) {
    scores.set("uk-emir", scores.get("emir")!);
    scores.delete("emir");
  }

  const general = Math.min(3, GENERAL_PATTERNS.filter((p) => p.test(`${title} ${body}`)).length);
  const genericScore = Math.min(GENERIC_CAP, scores.get(GENERIC_TOPIC) ?? 0);
  const specificScore = Array.from(scores.entries())
    .filter(([t]) => t !== GENERIC_TOPIC)
    .reduce((sum, [, s]) => sum + s, 0);
  // Ties go to the specific topic; "regulatory-change" is a generic fallback bucket.
  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1] || Number(a[0] === GENERIC_TOPIC) - Number(b[0] === GENERIC_TOPIC));
  const qualifies = specificScore > 0 || general >= 2;

  return {
    category: ranked.find(([t]) => t !== GENERIC_TOPIC)?.[0] ?? GENERIC_TOPIC,
    topics: ranked.map(([t]) => t).slice(0, 5),
    // Non-qualifying items are capped below the threshold so they are archived.
    relevance: qualifies ? specificScore + genericScore + general : Math.min(RELEVANCE_THRESHOLD - 1, genericScore + general),
    severity: HIGH_SEVERITY.test(title) ? "high" : "standard",
  };
}
