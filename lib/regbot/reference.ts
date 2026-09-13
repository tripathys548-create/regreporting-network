import { tokenize } from "@/lib/text";
import type { PipelineStage, RegBotAnswer } from "@/types";
import { buildCommunityView } from "./community";
import { answerFromLibrary } from "./libraryAnswer";

/*
 * Free RegBot: answers come only from the prewritten reference library. No
 * model calls and no demo corpus; unmatched questions get an honest answer.
 */

const NOT_COVERED =
  "RegBot's reference library does not cover this question yet. Try naming the regime, identifier or process (for example EMIR Refit, UTI, CFTC Part 45 or trade repository rejections), or ask the Community.";
const SCENARIO_NOTE =
  "For how this applies to a specific scenario, check the current regulatory technical standards and your trade repository's validation rules, or ask the Community for practitioner experience.";

export async function runReferenceRegBot(question: string): Promise<RegBotAnswer> {
  const started = performance.now();
  const library = answerFromLibrary(question);
  const lookupMs = Math.round((performance.now() - started) * 10) / 10;
  const tokens = tokenize(question);

  if (!library) {
    return {
      question,
      classification: { intent: "requirement-lookup", topics: [] },
      summary: NOT_COVERED,
      blocks: [],
      sources: [],
      conflicts: [],
      confidence: "low",
      confidenceRationale: "No reference library entry matched this question.",
      communityView: await buildCommunityView(tokens, []),
      pipeline: [{ name: "search", label: "Reference library lookup", detail: "No matching entry", durationMs: lookupMs }],
      mode: "library",
    };
  }

  // A scenario question that only mentions a term gets the definition plus a pointer, never an invented answer.
  const summary = library.weakMatch ? `${library.summary}\n\n${SCENARIO_NOTE}` : library.summary;
  const pipeline: PipelineStage[] = [
    { name: "classify", label: "Query classification", detail: `Question type: ${library.kind}${library.weakMatch ? " (term mentioned in a scenario)" : ""}; topics: ${library.classification.topics.join(", ") || "none detected"}`, durationMs: 0 },
    { name: "search", label: "Reference library lookup", detail: `Matched ${library.matched.join(", ") || "general guidance"}`, durationMs: lookupMs },
    { name: "cite", label: "Citations", detail: `${library.sources.length} authorities cited by the library entry`, durationMs: 0 },
    { name: "evaluate", label: "Confidence evaluation", detail: library.weakMatch ? "medium" : library.confidence, durationMs: 0 },
  ];

  return {
    question,
    classification: library.classification,
    summary,
    blocks: [],
    sources: library.sources,
    conflicts: [],
    confidence: library.weakMatch ? "medium" : library.confidence,
    confidenceRationale: library.weakMatch ? "The library defines the term but does not cover this specific scenario." : library.confidenceRationale,
    communityView: await buildCommunityView(tokens, library.classification.topics),
    pipeline,
    mode: "library",
  };
}
