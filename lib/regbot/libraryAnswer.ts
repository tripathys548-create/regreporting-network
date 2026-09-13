import type { AnswerSourceRef, Confidence, QueryClassification, QueryIntent, TopicSlug } from "@/types";
import { COMPARISONS, ENTRIES, GENERIC_REPORTS, REPORTING_FLOW, VERSION_CAVEAT, type LibraryEntry, type LibrarySource } from "./library";
import { resolveAuthority } from "./normalise";

/*
 * Matches a question to the prewritten RegBot reference library. Pure and
 * synchronous: no network, no model. Returns null when nothing matches so the
 * caller can fall back.
 */

export type LibraryAnswerKind = "definition" | "who-regulates" | "why-important" | "what-reported" | "field-count" | "comparison" | "reporting-flow";

export interface LibraryAnswer {
  kind: LibraryAnswerKind;
  /** True when the question mentions a library term but is not phrased as a definition (e.g. "What happens when the UTI is missing…"). */
  weakMatch: boolean;
  matched: string[];
  summary: string;
  classification: QueryClassification;
  sources: AnswerSourceRef[];
  confidence: Confidence;
  confidenceRationale: string;
}

const FIELD_COUNT = / how many (\w+ )*(fields?|data elements?|attributes|columns|elements) | (fields?|field) count | number of (\w+ )*(fields|data elements) /;
const COMPARE = / (vs|versus|compare|comparison|differ|difference|differences) /;
const REPORTING_FLOW_Q = / how (does|do|is) (\w+ )*(reporting|report) (\w+ )*(work|done|flow)| reporting (flow|lifecycle|process|workflow) /;
const WHO = / who (regulates|supervises|oversees|owns|governs|is responsible for) /;
const WHY = / why (is|are|does|do)( \w+)* (important|matter|matters|exist|needed|required) | why (does|do) (\w+ )*exist /;
const WHAT_REPORTED = / what (do|does|data|information|fields) (\w+ )*(report|reported) | what is reported | what gets reported /;
const DEFINITION_Q = /^ (what is|what are|whats|what does|define|definition of|explain|meaning of|tell me about|describe|overview of)( an?| the)? /;
const MAX_TERM_ONLY_WORDS = 4;

const RATIONALE = "Prewritten RegBot reference answer based on established regulatory definitions; no live source search was performed.";

export function normaliseQuestion(question: string): string {
  return ` ${question
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9&]+/g, " ")
    .trim()} `;
}

/** Entries mentioned in the question, in order of appearance; a longer match wins over one it contains ("uk emir" over "emir"). */
export function findEntries(normalised: string): LibraryEntry[] {
  const hits = ENTRIES.flatMap((entry) => {
    let best: { start: number; end: number } | null = null;
    for (const term of entry.terms) {
      const needle = ` ${term} `;
      const start = normalised.indexOf(needle);
      if (start >= 0 && (!best || needle.length > best.end - best.start)) best = { start, end: start + needle.length };
    }
    return best ? [{ entry, ...best }] : [];
  });
  return hits
    .filter((h) => !hits.some((o) => o !== h && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start))
    .sort((a, b) => a.start - b.start)
    .map((h) => h.entry);
}

function toSourceRefs(sources: LibrarySource[]): AnswerSourceRef[] {
  const seen = new Set<string>();
  return sources
    .filter((s) => {
      const key = `${s.authority}|${s.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5)
    .map((s, i) => {
      const authority = resolveAuthority(s.authority);
      return {
        sourceDocumentId: `library-${i}`,
        sourceShortName: authority.shortName,
        sourceType: s.category,
        tier: authority.tier,
        title: s.title,
        locator: "Reference library citation — verify in the current official publication",
        publishedAt: null,
        url: authority.url,
        isDemo: false,
      };
    });
}

function build(kind: LibraryAnswerKind, entries: LibraryEntry[], summary: string, intent: QueryIntent, confidence: Confidence = "high", rationale = RATIONALE): LibraryAnswer {
  const caveat = entries.some((e) => e.dateSensitive) && !summary.includes(VERSION_CAVEAT) ? `\n\n${VERSION_CAVEAT}` : "";
  const topics = Array.from(new Set(entries.flatMap((e) => e.topics))).slice(0, 5) as TopicSlug[];
  return {
    kind,
    weakMatch: false,
    matched: entries.map((e) => e.id),
    summary: `${summary}${caveat}`,
    classification: { intent, topics },
    sources: toSourceRefs(entries.flatMap((e) => e.sources)),
    confidence,
    confidenceRationale: rationale,
  };
}

function fieldCountAnswer(entry: LibraryEntry | undefined): LibraryAnswer {
  if (entry?.id === "aml") {
    return build(
      "field-count",
      [entry],
      "AML has no single universal reporting-field count: the number of fields depends on the reporting form, jurisdiction, reporting type (for example a suspicious activity report or a threshold-based report) and the financial intelligence unit's technical specification.",
      "requirement-lookup",
      "high",
      "RegBot does not give field counts without the specific form, jurisdiction and specification version.",
    );
  }
  const subject = entry ? entry.label : "regulatory reporting";
  const summary = `The exact ${subject} field count depends on the applicable reporting specification and version, so RegBot needs the jurisdiction, reporting type, message/schema version and whether you mean total, mandatory, conditional or optional fields before giving a precise number.
- Check the regulator's current technical standards and validation rules
- Check your trade repository's current message specification
- Confirm the reporting population and the schema version in production`;
  return build("field-count", entry ? [entry] : [], summary, "requirement-lookup", "high", "RegBot does not give field counts without the specific regulation, schema and version.");
}

function comparisonAnswer(a: LibraryEntry, b: LibraryEntry): LibraryAnswer {
  const prewritten = COMPARISONS[[a.id, b.id].sort().join("|")];
  const summary = prewritten ?? `${a.label} and ${b.label} cover different parts of the regulatory reporting landscape:\n- ${a.label}: ${a.definition}\n- ${b.label}: ${b.definition}`;
  return build("comparison", [a, b], summary, "definition");
}

export function answerFromLibrary(question: string): LibraryAnswer | null {
  const q = normaliseQuestion(question);
  const entries = findEntries(q);
  const [first] = entries;

  if (FIELD_COUNT.test(q)) return fieldCountAnswer(first);
  if (COMPARE.test(q) && entries.length >= 2) return comparisonAnswer(entries[0], entries[1]);
  if (REPORTING_FLOW_Q.test(q)) return build("reporting-flow", entries.slice(0, 1), REPORTING_FLOW, "implementation-how-to");
  if (!first) return null;

  if (WHO.test(q)) return build("who-regulates", [first], first.regulator ?? first.definition, "requirement-lookup");
  if (WHY.test(q)) return build("why-important", [first], first.why ?? first.definition, "definition");
  if (WHAT_REPORTED.test(q)) return build("what-reported", [first], first.reports ?? GENERIC_REPORTS, "requirement-lookup");

  const definition = build("definition", [first], first.definition, "definition");
  const termOnly = q.trim().split(" ").length <= MAX_TERM_ONLY_WORDS;
  return { ...definition, weakMatch: !DEFINITION_Q.test(q) && !termOnly };
}
