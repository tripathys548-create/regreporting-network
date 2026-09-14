export type DailyDifficulty = "foundation" | "practitioner" | "expert";

/** Q1-Q3 are fixed to EMIR/CFTC/MAS every day. Q4-Q5 rotate through the remaining categories. */
export type DailyCategory =
  | "EMIR"
  | "CFTC"
  | "MAS"
  | "SFTR"
  | "MiFIR"
  | "UTI"
  | "UPI"
  | "LEI"
  | "Trade Repository"
  | "Data Quality"
  | "Validation"
  | "Lifecycle Events"
  | "Regulatory Change";

export interface DailyQuestion {
  id: string;
  category: DailyCategory;
  difficulty: DailyDifficulty;
  prompt: string;
  /** Exactly four options, in A/B/C/D order. */
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
  source: string;
  sourceUrl?: string;
  effectiveDate?: string;
}

export interface DailyQuestionResult {
  questionId: string;
  category: DailyCategory;
  selectedIndex: number;
  correct: boolean;
  answeredAt: string;
  timeMs: number;
}

export interface DailySetRecord {
  dateKey: string;
  questionIds: string[];
  results: Record<string, DailyQuestionResult>;
  completedAt: string | null;
  baseXp: number;
  speedBonus: number;
  streakBonus: number;
}

export interface DailyProgressState {
  history: Record<string, DailySetRecord>;
  streakDays: number;
  lastCompletedDate: string | null;
}
