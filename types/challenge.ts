import type { Citation, ID, ISODateString, TopicSlug } from "./common";

export type ChallengeType = "spot-the-rejection" | "regulatory-quiz" | "fix-the-report";

export type Difficulty = "foundation" | "practitioner" | "expert";

export interface Challenge {
  id: ID;
  slug: string;
  type: ChallengeType;
  title: string;
  description: string;
  topic: TopicSlug;
  difficulty: Difficulty;
  questionIds: ID[];
  estimatedMinutes: number;
}

export interface ScenarioField {
  name: string;
  value: string;
  /** Revealed only after the user answers. */
  issue?: string;
}

export interface ReportScenario {
  title: string;
  context: string;
  fields: ScenarioField[];
}

export interface ChallengeOption {
  id: string;
  label: string;
}

export interface ChallengeQuestion {
  id: ID;
  challengeId: ID;
  prompt: string;
  scenario: ReportScenario | null;
  options: ChallengeOption[];
  correctOptionId: string;
  explanation: string;
  references: Citation[];
  isDemo: boolean;
}

export interface LeaderboardEntry {
  userId: ID;
  rank: number;
  score: number;
  streakDays: number;
  period: "week" | "all-time";
}

export interface ChallengeAttempt {
  questionId: ID;
  selectedOptionId: string;
  correct: boolean;
  answeredAt: ISODateString;
}
