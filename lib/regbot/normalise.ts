import { SOURCES } from "@/data/sources";
import { isTopicSlug } from "@/data/topics";
import { SOURCE_TYPE_ORDER } from "@/lib/constants";
import type { AnswerBlock, AnswerSourceRef, Confidence, QueryClassification, QueryIntent, SourceTier, SourceType } from "@/types";

/*
 * Turns the model's regbot_answer tool input into the RegBotAnswer contract.
 * The model is untrusted input: every field is validated, unknown values are
 * dropped, and no URL the model writes is ever used — links come only from the
 * official-domain registry below.
 */

export const QUERY_INTENTS: QueryIntent[] = ["requirement-lookup", "validation-rejection", "implementation-how-to", "definition", "out-of-scope"];
export const CONFIDENCE_LEVELS: Confidence[] = ["high", "medium", "low"];

const MAX_ANSWER_LENGTH = 4000;
const MAX_STATEMENTS = 4;
const MAX_SOURCES = 5;

/** Official authorities outside the Radar registry, with their verified websites. */
const OTHER_AUTHORITIES: { names: string[]; shortName: string; tier: SourceTier; websiteUrl: string }[] = [
  { names: ["mas", "monetary authority of singapore"], shortName: "MAS", tier: 1, websiteUrl: "https://www.mas.gov.sg" },
  { names: ["asic"], shortName: "ASIC", tier: 1, websiteUrl: "https://asic.gov.au" },
  { names: ["hkma"], shortName: "HKMA", tier: 1, websiteUrl: "https://www.hkma.gov.hk" },
  { names: ["sfc"], shortName: "SFC", tier: 1, websiteUrl: "https://www.sfc.hk" },
  { names: ["jfsa", "fsa japan"], shortName: "JFSA", tier: 1, websiteUrl: "https://www.fsa.go.jp" },
  { names: ["finma"], shortName: "FINMA", tier: 1, websiteUrl: "https://www.finma.ch" },
  { names: ["fatf"], shortName: "FATF", tier: 1, websiteUrl: "https://www.fatf-gafi.org" },
  { names: ["fincen"], shortName: "FinCEN", tier: 1, websiteUrl: "https://www.fincen.gov" },
  { names: ["fiu-ind", "fiu india"], shortName: "FIU-IND", tier: 1, websiteUrl: "https://fiuindia.gov.in" },
];

const text = (value: unknown, max = MAX_ANSWER_LENGTH) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);
const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === "object" ? (value as Record<string, unknown>) : {});

function resolveAuthority(name: string): { shortName: string; tier: SourceTier; url: string | null } {
  const key = name.trim().toLowerCase();
  const registered = SOURCES.find((s) => s.shortName.toLowerCase() === key || s.slug === key || s.fullName.toLowerCase() === key);
  if (registered) return { shortName: registered.shortName, tier: registered.tier, url: registered.websiteUrl };
  const other = OTHER_AUTHORITIES.find((a) => a.names.includes(key));
  if (other) return { shortName: other.shortName, tier: other.tier, url: other.websiteUrl };
  return { shortName: name.trim().slice(0, 40) || "Unnamed source", tier: 3, url: null };
}

export interface NormalisedAnswer {
  summary: string;
  classification: QueryClassification;
  blocks: AnswerBlock[];
  sources: AnswerSourceRef[];
  confidence: Confidence;
  confidenceRationale: string;
}

export function normaliseModelAnswer(input: unknown): NormalisedAnswer {
  const raw = asRecord(input);
  const answer = text(raw.answer);
  if (!answer) throw new Error("RegBot model returned an empty answer.");

  const caveat = text(raw.caveat, 500);
  const intent = oneOf(raw.intent, QUERY_INTENTS, "requirement-lookup");
  const topics = Array.from(new Set(list(raw.topics).filter((t): t is string => typeof t === "string" && isTopicSlug(t)))).slice(0, 5) as QueryClassification["topics"];

  const sources: AnswerSourceRef[] = list(raw.sources)
    .map(asRecord)
    .filter((s) => text(s.authority, 80) && text(s.title, 300))
    .slice(0, MAX_SOURCES)
    .map((s, i) => {
      const authority = resolveAuthority(text(s.authority, 80));
      return {
        sourceDocumentId: `live-${i}`,
        sourceShortName: authority.shortName,
        sourceType: oneOf<SourceType>(s.category, SOURCE_TYPE_ORDER, "regulatory-requirement"),
        tier: authority.tier,
        title: text(s.title, 300),
        locator: "Named by RegBot, not retrieved — verify in the current official publication",
        publishedAt: null,
        url: authority.url,
        isDemo: false,
      };
    });

  const blocks: AnswerBlock[] = list(raw.statements)
    .map(asRecord)
    .filter((s) => text(s.text))
    .slice(0, MAX_STATEMENTS)
    .map((s) => ({
      sourceType: oneOf<SourceType>(s.category, SOURCE_TYPE_ORDER, "industry-guidance"),
      text: text(s.text, 1500),
      sourceRefs: Array.from(new Set(list(s.source_indexes).filter((n): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) < sources.length))),
    }));

  return {
    summary: caveat ? `${answer}\n\n${caveat}` : answer,
    classification: { intent, topics },
    blocks,
    sources,
    confidence: intent === "out-of-scope" ? "low" : oneOf(raw.confidence, CONFIDENCE_LEVELS, "low"),
    confidenceRationale: text(raw.confidence_rationale, 500) || "Answer generated from the model's knowledge without live source retrieval.",
  };
}
