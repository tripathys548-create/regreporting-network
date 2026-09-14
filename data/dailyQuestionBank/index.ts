import type { DailyCategory, DailyQuestion } from "@/types";
import { CFTC_QUESTIONS } from "./cftc";
import { EMIR_QUESTIONS } from "./emir";
import { LEI_QUESTIONS } from "./lei";
import { LIFECYCLE_EVENTS_QUESTIONS } from "./lifecycleEvents";
import { MAS_QUESTIONS } from "./mas";
import { MIFIR_QUESTIONS } from "./mifir";
import { REGULATORY_CHANGE_QUESTIONS } from "./regulatoryChange";
import { SFTR_QUESTIONS } from "./sftr";
import { TRADE_REPOSITORY_DATA_QUALITY_QUESTIONS } from "./tradeRepositoryDataQuality";
import { UPI_QUESTIONS } from "./upi";
import { UTI_QUESTIONS } from "./uti";
import { VALIDATION_QUESTIONS } from "./validation";

/** The full daily-challenge question bank, ≥130 questions across every category. */
export const DAILY_QUESTION_BANK: DailyQuestion[] = [
  ...EMIR_QUESTIONS,
  ...CFTC_QUESTIONS,
  ...MAS_QUESTIONS,
  ...SFTR_QUESTIONS,
  ...MIFIR_QUESTIONS,
  ...UTI_QUESTIONS,
  ...UPI_QUESTIONS,
  ...LEI_QUESTIONS,
  ...TRADE_REPOSITORY_DATA_QUALITY_QUESTIONS,
  ...VALIDATION_QUESTIONS,
  ...LIFECYCLE_EVENTS_QUESTIONS,
  ...REGULATORY_CHANGE_QUESTIONS,
];

/** Q4/Q5 rotate through these categories; Q1-3 are always EMIR, CFTC, MAS. */
export const ROTATING_CATEGORIES: DailyCategory[] = [
  "SFTR",
  "MiFIR",
  "UTI",
  "UPI",
  "LEI",
  "Trade Repository",
  "Data Quality",
  "Lifecycle Events",
  "Validation",
  "Regulatory Change",
];

export const QUESTIONS_BY_CATEGORY: Record<DailyCategory, DailyQuestion[]> = DAILY_QUESTION_BANK.reduce(
  (acc, q) => {
    (acc[q.category] ??= []).push(q);
    return acc;
  },
  {} as Record<DailyCategory, DailyQuestion[]>,
);
