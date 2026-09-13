import Anthropic from "@anthropic-ai/sdk";
import { TOPICS } from "@/data/topics";
import { SOURCE_TYPE_ORDER } from "@/lib/constants";
import { tokenize } from "@/lib/text";
import type { PipelineStage, RegBotAnswer } from "@/types";
import { REGBOT_DEFAULT_MODEL } from "./config";
import { CONFIDENCE_LEVELS, normaliseModelAnswer, QUERY_INTENTS } from "./normalise";
import { buildCommunityView } from "./pipeline";
import { REGBOT_SYSTEM_PROMPT } from "./systemPrompt";

/*
 * Live RegBot: one Claude call that must answer through the regbot_answer tool,
 * so the response always fits the RegBotAnswer contract the UI renders. There is
 * no retrieval yet — sources are authorities the model names, labelled as such.
 */

const MAX_OUTPUT_TOKENS = 1500;

const ANSWER_TOOL: Anthropic.Tool = {
  name: "regbot_answer",
  description: "Return RegBot's answer to the user's regulatory reporting question.",
  input_schema: {
    type: "object",
    properties: {
      answer: {
        type: "string",
        description: "The direct answer. Exactly one sentence for simple questions; for lists, comparisons, field counts or processes, a lead sentence followed by lines starting with '- '. Plain text only.",
      },
      intent: { type: "string", enum: QUERY_INTENTS },
      topics: { type: "array", items: { type: "string", enum: TOPICS.map((t) => t.slug) }, description: "Platform topics the question relates to; empty if none apply." },
      statements: {
        type: "array",
        maxItems: 4,
        description: "Only when the answer mixes authority levels (e.g. regulation vs ISDA guidance vs TR convention): separate statements, each labelled by category. Omit for simple definitions.",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: SOURCE_TYPE_ORDER },
            text: { type: "string" },
            source_indexes: { type: "array", items: { type: "integer" }, description: "Zero-based indexes into sources that support this statement." },
          },
          required: ["category", "text"],
        },
      },
      sources: {
        type: "array",
        maxItems: 5,
        description: "Authorities and documents the answer relies on. Name a document only if you are confident it exists. Never include URLs.",
        items: {
          type: "object",
          properties: {
            authority: { type: "string", description: "Publisher short name, e.g. ESMA, FCA, CFTC, SEC, MAS, ASIC, FATF, ISDA, DTCC, GLEIF." },
            title: { type: "string", description: "Regulation, rule or document name, e.g. 'CFTC Part 45 — Swap Data Recordkeeping and Reporting Requirements'." },
            category: { type: "string", enum: SOURCE_TYPE_ORDER },
          },
          required: ["authority", "title", "category"],
        },
      },
      confidence: { type: "string", enum: CONFIDENCE_LEVELS },
      confidence_rationale: { type: "string", description: "One sentence explaining the confidence level; mention that no live source retrieval was used." },
      caveat: { type: "string", description: "Optional one-sentence date or version caveat." },
    },
    required: ["answer", "intent", "topics", "confidence", "confidence_rationale"],
  },
};

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 60_000, maxRetries: 1 }));

export async function runLiveRegBot(question: string): Promise<RegBotAnswer> {
  const model = process.env.REGBOT_MODEL || REGBOT_DEFAULT_MODEL;
  const started = performance.now();
  const response = await getClient().messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [{ type: "text", text: REGBOT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [ANSWER_TOOL],
    tool_choice: { type: "tool", name: ANSWER_TOOL.name },
    messages: [{ role: "user", content: question }],
  });
  const generationMs = Math.round(performance.now() - started);

  if (response.stop_reason === "max_tokens") throw new Error("RegBot answer was cut off by the output token limit.");
  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) throw new Error(`RegBot model returned no structured answer (stop reason: ${response.stop_reason}).`);

  const answer = normaliseModelAnswer(toolUse.input);

  const communityStarted = performance.now();
  const communityView = await buildCommunityView(tokenize(question), answer.classification.topics);

  const stages: PipelineStage[] = [
    { name: "classify", label: "Query classification", detail: `Intent: ${answer.classification.intent}; topics: ${answer.classification.topics.join(", ") || "none detected"}`, durationMs: 0 },
    { name: "generate", label: "Answer generation", detail: `${model} · ${response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0)} input / ${response.usage.output_tokens} output tokens · no live source retrieval`, durationMs: generationMs },
    { name: "cite", label: "Source attribution", detail: `${answer.sources.length} authorities named by the model (not retrieved documents)`, durationMs: 0 },
    { name: "evaluate", label: "Confidence evaluation", detail: `${answer.confidence}; community check in ${Math.round(performance.now() - communityStarted)}ms`, durationMs: 0 },
  ];

  return { question, ...answer, conflicts: [], communityView, pipeline: stages, mode: "live" };
}
