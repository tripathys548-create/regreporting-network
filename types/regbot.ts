import type { ID, ISODateString, SourceTier, SourceType, TopicSlug } from "./common";

export type Confidence = "high" | "medium" | "low";

export type QueryIntent = "requirement-lookup" | "validation-rejection" | "implementation-how-to" | "definition" | "out-of-scope";

export interface QueryClassification {
  intent: QueryIntent;
  topics: TopicSlug[];
}

/** A retrieved passage from a trusted document. */
export interface RetrievedPassage {
  id: ID;
  sourceDocumentId: ID;
  sourceType: SourceType;
  tier: SourceTier;
  locator: string;
  text: string;
  score: number;
}

export interface AnswerSourceRef {
  sourceDocumentId: ID;
  sourceShortName: string;
  sourceType: SourceType;
  tier: SourceTier;
  title: string;
  locator: string;
  publishedAt: ISODateString;
  url: string;
  isDemo: boolean;
}

/** One statement in an answer, always attributed to a source type. */
export interface AnswerBlock {
  sourceType: SourceType;
  text: string;
  /** Indexes into RegBotAnswer.sources. */
  sourceRefs: number[];
}

export interface SourceConflict {
  summary: string;
  sourceRefs: number[];
}

export interface CommunityView {
  responseCount: number;
  summary: string;
  discussionSlugs: string[];
}

export type PipelineStageName =
  | "classify"
  | "search"
  | "retrieve"
  | "extract"
  | "generate"
  | "cite"
  | "evaluate";

export interface PipelineStage {
  name: PipelineStageName;
  label: string;
  detail: string;
  durationMs: number;
}

export interface RegBotAnswer {
  question: string;
  classification: QueryClassification;
  summary: string;
  blocks: AnswerBlock[];
  sources: AnswerSourceRef[];
  conflicts: SourceConflict[];
  confidence: Confidence;
  confidenceRationale: string;
  communityView: CommunityView | null;
  pipeline: PipelineStage[];
  /** "mock" until the RAG backend is connected. The UI must surface this. */
  mode: "mock" | "live";
}

export interface RegBotRequest {
  question: string;
  sessionId?: ID | null;
}

export type RegBotResponse = { ok: true; sessionId: ID; answer: RegBotAnswer } | { ok: false; error: string };

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: ID;
  sessionId: ID;
  role: ChatRole;
  content: string;
  answer: RegBotAnswer | null;
  createdAt: ISODateString;
}

export interface ChatSession {
  id: ID;
  userId: ID;
  title: string;
  createdAt: ISODateString;
  escalatedDiscussionId: ID | null;
}
