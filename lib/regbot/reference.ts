import { tokenize } from "@/lib/text";
import type { PipelineStage, RegBotAnswer } from "@/types";
import { answerFromLibrary } from "./libraryAnswer";
import { buildCommunityView, runRegBotPipeline } from "./pipeline";

/*
 * Free RegBot: prewritten reference library first, then the demo corpus
 * pipeline, then an honest "not covered yet" answer. No model calls.
 */

const NOT_COVERED =
  "RegBot's reference library does not cover this question yet. Try naming the regime, identifier or process (for example EMIR Refit, UTI, CFTC Part 45 or trade repository rejections), or ask the Community.";
const OUT_OF_SCOPE = "RegBot covers financial regulatory reporting, compliance, operations and RegTech topics, so it cannot help with this question.";

export async function runReferenceRegBot(question: string): Promise<RegBotAnswer> {
  const started = performance.now();
  const library = answerFromLibrary(question);
  const lookupMs = Math.round((performance.now() - started) * 10) / 10;

  // A scenario question that merely mentions a term ("What happens when the UTI is missing…")
  // is better served by a matching demo passage than by the term's definition.
  if (library?.weakMatch) {
    const demo = await runRegBotPipeline(question);
    if (demo.blocks.length > 0) return demo;
  }

  if (library) {
    const communityView = await buildCommunityView(tokenize(question), library.classification.topics);
    const pipeline: PipelineStage[] = [
      { name: "classify", label: "Query classification", detail: `Question type: ${library.kind}; topics: ${library.classification.topics.join(", ") || "none detected"}`, durationMs: 0 },
      { name: "search", label: "Reference library lookup", detail: `Matched ${library.matched.join(", ") || "general guidance"}`, durationMs: lookupMs },
      { name: "cite", label: "Citations", detail: `${library.sources.length} authorities cited by the library entry`, durationMs: 0 },
      { name: "evaluate", label: "Confidence evaluation", detail: library.confidence, durationMs: 0 },
    ];
    return {
      question,
      classification: library.classification,
      summary: library.summary,
      blocks: [],
      sources: library.sources,
      conflicts: [],
      confidence: library.confidence,
      confidenceRationale: library.confidenceRationale,
      communityView,
      pipeline,
      mode: "library",
    };
  }

  const demo = await runRegBotPipeline(question);
  if (demo.blocks.length > 0) return demo;

  const outOfScope = demo.classification.intent === "out-of-scope";
  return {
    ...demo,
    summary: outOfScope ? OUT_OF_SCOPE : NOT_COVERED,
    confidence: "low",
    confidenceRationale: outOfScope ? "The question is outside regulatory reporting topics." : "No reference library entry or demo passage matched this question.",
    mode: "library",
  };
}
