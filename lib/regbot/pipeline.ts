import { CORPUS, type CorpusPassage } from "@/data/regbotCorpus";
import { TOPICS } from "@/data/topics";
import { prisma } from "@/lib/db";
import { SOURCE_TYPE_ORDER } from "@/lib/constants";
import { getDocuments, getSourceSync } from "@/lib/repositories/sources";
import { excerpt, termsMatch, tokenize } from "@/lib/text";
import type {
  AnswerBlock,
  AnswerSourceRef,
  CommunityView,
  Confidence,
  PipelineStage,
  PipelineStageName,
  QueryClassification,
  QueryIntent,
  RegBotAnswer,
  RetrievedPassage,
  SourceConflict,
  SourceDocument,
  TopicSlug,
} from "@/types";

/*
 * RegBot answer pipeline.
 *
 *   classify → search trusted sources → retrieve documents → extract passages
 *   → generate answer → build citations → evaluate confidence
 *
 * Phase 1 runs every stage against the fixed demo corpus with deterministic,
 * extractive logic — there is no LLM and no live source search. Each stage is a
 * separate function so Phase 4 can replace them one at a time (vector search,
 * LLM generation, citation verification) without changing the response contract.
 */

const MIN_PASSAGE_SCORE = 2;
const MAX_PASSAGES = 6;

/** Known disagreements between passages. Phase 4: detected by the evaluator instead. */
const KNOWN_CONFLICTS: { passageIds: [string, string]; summary: string }[] = [
  {
    passageIds: ["p-uti-timing-conflict", "p-uti-validation"],
    summary:
      "An industry practice note suggests reporting with a provisional identifier when the UTI arrives late, while the validation reference treats the UTI as mandatory for existing trades. RegBot does not resolve this — check the regulator's position for your regime.",
  },
];

const INTENT_KEYWORDS: [QueryIntent, string[]][] = [
  ["validation-rejection", ["reject", "rejection", "validation", "fail", "error", "missing", "break"]],
  ["implementation-how-to", ["handle", "approach", "implement", "process", "control", "manage", "best"]],
  ["definition", ["define", "definition", "meaning", "explain", "overview"]],
  ["requirement-lookup", ["require", "requirement", "obligation", "must", "deadline", "rule"]],
];

async function timed<T>(stages: PipelineStage[], name: PipelineStageName, label: string, fn: () => T | Promise<T>, detail: (r: T) => string): Promise<T> {
  const start = performance.now();
  const result = await fn();
  stages.push({ name, label, detail: detail(result), durationMs: Math.round((performance.now() - start) * 10) / 10 });
  return result;
}

function classifyQuery(tokens: string[]): QueryClassification {
  const topics = TOPICS.filter((t) => tokens.some((tok) => termsMatch(tok, t.slug.replace(/-/g, "")) || t.label.toLowerCase().split(/\s+/).some((w) => termsMatch(tok, w)))).map((t) => t.slug);
  const intent = INTENT_KEYWORDS.find(([, words]) => tokens.some((tok) => words.some((w) => termsMatch(tok, w))))?.[0];
  return { intent: intent ?? (topics.length ? "requirement-lookup" : "out-of-scope"), topics };
}

function scorePassage(passage: CorpusPassage, tokens: string[], topics: TopicSlug[]): number {
  const keywordHits = passage.keywords.filter((k) => tokens.some((t) => termsMatch(t, k))).length;
  const topicHits = passage.topics.filter((t) => topics.includes(t)).length;
  return keywordHits + topicHits * 0.5;
}

function searchTrustedSources(tokens: string[], classification: QueryClassification): CorpusPassage[] {
  return CORPUS.filter((p) => scorePassage(p, tokens, classification.topics) > 0);
}

function extractPassages(candidates: CorpusPassage[], documents: SourceDocument[], tokens: string[], classification: QueryClassification): RetrievedPassage[] {
  return candidates
    .flatMap((p) => {
      const doc = documents.find((d) => d.id === p.sourceDocumentId);
      if (!doc) return []; // never cite a passage whose document is not in the registry
      return [
        {
          id: p.id,
          sourceDocumentId: p.sourceDocumentId,
          sourceType: p.sourceType,
          tier: getSourceSync(doc.sourceId).tier,
          locator: p.locator,
          text: p.text,
          score: scorePassage(p, tokens, classification.topics),
        },
      ];
    })
    .filter((p) => p.score >= MIN_PASSAGE_SCORE)
    // Higher authority first, then relevance.
    .sort((a, b) => a.tier - b.tier || b.score - a.score)
    .slice(0, MAX_PASSAGES);
}

function buildCitations(passages: RetrievedPassage[], documents: SourceDocument[]): { sources: AnswerSourceRef[]; refIndex: Map<string, number> } {
  const sources: AnswerSourceRef[] = [];
  const refIndex = new Map<string, number>();
  for (const passage of passages) {
    const doc = documents.find((d) => d.id === passage.sourceDocumentId);
    if (!doc) continue;
    const key = `${doc.id}|${passage.locator}`;
    if (refIndex.has(key)) continue;
    const source = getSourceSync(doc.sourceId);
    refIndex.set(key, sources.length);
    sources.push({
      sourceDocumentId: doc.id,
      sourceShortName: source.shortName,
      sourceType: passage.sourceType,
      tier: source.tier,
      title: doc.title,
      locator: passage.locator,
      publishedAt: doc.publishedAt,
      url: doc.url,
      isDemo: doc.isDemo,
    });
  }
  return { sources, refIndex };
}

function generateBlocks(passages: RetrievedPassage[], refIndex: Map<string, number>): AnswerBlock[] {
  return SOURCE_TYPE_ORDER.flatMap((type) => {
    const group = passages.filter((p) => p.sourceType === type);
    if (group.length === 0) return [];
    return [
      {
        sourceType: type,
        text: group.map((p) => p.text).join(" "),
        sourceRefs: Array.from(new Set(group.map((p) => refIndex.get(`${p.sourceDocumentId}|${p.locator}`)).filter((i): i is number => i !== undefined))),
      },
    ];
  });
}

function detectConflicts(passages: RetrievedPassage[], refIndex: Map<string, number>): SourceConflict[] {
  const ids = new Set(passages.map((p) => p.id));
  return KNOWN_CONFLICTS.filter((c) => c.passageIds.every((id) => ids.has(id))).map((c) => ({
    summary: c.summary,
    sourceRefs: c.passageIds
      .map((id) => passages.find((p) => p.id === id))
      .map((p) => (p ? refIndex.get(`${p.sourceDocumentId}|${p.locator}`) : undefined))
      .filter((i): i is number => i !== undefined),
  }));
}

function evaluateConfidence(passages: RetrievedPassage[], conflicts: SourceConflict[]): { confidence: Confidence; rationale: string } {
  const hasRequirement = passages.some((p) => p.sourceType === "regulatory-requirement");
  const distinctTypes = new Set(passages.map((p) => p.sourceType)).size;
  if (passages.length === 0) return { confidence: "low", rationale: "No sufficiently relevant passages were found in the trusted-source corpus." };
  if (conflicts.length > 0) return { confidence: "medium", rationale: "Relevant sources were found, but they do not fully agree." };
  if (hasRequirement && passages.length >= 3 && distinctTypes >= 2)
    return { confidence: "high", rationale: "Supported by a regulatory source and corroborated by at least one other source type." };
  if (hasRequirement) return { confidence: "medium", rationale: "Supported by a regulatory source, with limited corroboration." };
  return { confidence: "low", rationale: "No Tier 1 regulatory source was found; answer relies on guidance or implementation material." };
}

async function buildCommunityView(tokens: string[], topics: TopicSlug[]): Promise<CommunityView | null> {
  const candidates = await prisma.discussion.findMany({
    where: { status: "published" },
    select: { slug: true, category: true, tags: true, voteScore: true, replyCount: true, acceptedCommentId: true },
  });
  const related = candidates
    .filter((d) => {
      const tags = d.tags;
      return topics.includes(d.category as TopicSlug) || tags.some((tag) => tokens.some((t) => termsMatch(t, tag.toLowerCase())));
    })
    .sort((a, b) => b.voteScore - a.voteScore)
    .slice(0, 3);
  if (related.length === 0) return null;

  const acceptedIds = related.map((d) => d.acceptedCommentId).filter((id): id is string => Boolean(id));
  const accepted = acceptedIds.length ? await prisma.comment.findFirst({ where: { id: { in: acceptedIds }, status: "published" } }) : null;
  const responseCount = related.reduce((sum, d) => sum + d.replyCount, 0);

  return {
    responseCount,
    summary: accepted
      ? `The most-endorsed member answer suggests: "${excerpt(accepted.body, 200)}"`
      : "Members are actively discussing this area, but no answer has been accepted yet.",
    discussionSlugs: related.map((d) => d.slug),
  };
}

function composeSummary(blocks: AnswerBlock[], confidence: Confidence): string {
  if (blocks.length === 0) {
    return "RegBot could not find enough trusted-source material to answer this question. Rather than guess, it recommends asking the community or rephrasing with a specific regime, field or event type.";
  }
  const lead = blocks[0];
  const prefix = lead.sourceType === "regulatory-requirement" ? "Based on the regulatory sources retrieved" : "No regulatory requirement was retrieved; based on the guidance available";
  return `${prefix} (${confidence} confidence): ${lead.text.split(/(?<=\.)\s/)[0]}`;
}

export async function runRegBotPipeline(question: string): Promise<RegBotAnswer> {
  const stages: PipelineStage[] = [];
  const tokens = tokenize(question);

  const classification = await timed(stages, "classify", "Query classification", () => classifyQuery(tokens), (c) =>
    `Intent: ${c.intent}; topics: ${c.topics.length ? c.topics.join(", ") : "none detected"}`,
  );

  const candidates = await timed(stages, "search", "Trusted source search", () => searchTrustedSources(tokens, classification), (r) =>
    `${r.length} candidate passages across Tier 1–3 sources`,
  );

  const documents = await timed(stages, "retrieve", "Document retrieval", () => getDocuments(candidates.map((c) => c.sourceDocumentId)), (d) =>
    `${d.length} documents loaded`,
  );

  const passages = await timed(stages, "extract", "Relevant passage extraction", () => extractPassages(candidates, documents, tokens, classification), (p) =>
    `${p.length} passages above relevance threshold`,
  );

  // Nothing in the trusted corpus and no reporting topic detected: treat as out of scope.
  if (passages.length === 0 && classification.topics.length === 0) {
    classification.intent = "out-of-scope";
    stages[0].detail = "Intent: out-of-scope; topics: none detected";
  }

  const { sources, refIndex } = await timed(stages, "cite", "Citation generation", () => buildCitations(passages, documents), (r) =>
    `${r.sources.length} citations`,
  );

  const blocks = await timed(stages, "generate", "Answer generation", () => generateBlocks(passages, refIndex), (b) =>
    `Extractive demo generation — ${b.length} attributed blocks (no LLM connected)`,
  );

  const conflicts = detectConflicts(passages, refIndex);
  const { confidence, rationale } = await timed(stages, "evaluate", "Confidence evaluation", () => evaluateConfidence(passages, conflicts), (e) =>
    `${e.confidence}${conflicts.length ? `; ${conflicts.length} conflict(s) flagged` : ""}`,
  );

  // Display order follows the architecture diagram.
  const order: PipelineStageName[] = ["classify", "search", "retrieve", "extract", "generate", "cite", "evaluate"];
  stages.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  return {
    question,
    classification,
    summary: composeSummary(blocks, confidence),
    blocks,
    sources,
    conflicts,
    confidence,
    confidenceRationale: rationale,
    communityView: await buildCommunityView(tokens, classification.topics),
    pipeline: stages,
    mode: "mock",
  };
}
