import { DAILY_QUESTION_BANK, QUESTIONS_BY_CATEGORY, ROTATING_CATEGORIES } from "@/data/dailyQuestionBank";
import { toDateKey } from "@/lib/format";
import type { DailyCategory, DailyDifficulty, DailyQuestion } from "@/types";

const DAY_MS = 86_400_000;
const DEDUP_WINDOW_DAYS = 30;

/** Small deterministic string hash (FNV-1a), used to pick a stable "random" index per day. */
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function dayIndex(dateKey: string): number {
  return Math.floor(new Date(`${dateKey}T00:00:00Z`).getTime() / DAY_MS);
}

/** The two rotating-topic categories for a given date — same for every user, cycling through all ten every 10 days. */
export function rotatingCategoriesForDate(dateKey: string): [DailyCategory, DailyCategory] {
  const n = ROTATING_CATEGORIES.length;
  const idx = dayIndex(dateKey);
  const a = ((idx % n) + n) % n;
  const b = ((idx + 1) % n + n) % n;
  return [ROTATING_CATEGORIES[a], ROTATING_CATEGORIES[b]];
}

/** New/low-accuracy users get gentler difficulty; high performers see more Practitioner/Expert. */
export function difficultyForRotatingSlot(accuracy: number | null, slot: "Q4" | "Q5"): DailyDifficulty {
  if (accuracy === null) return slot === "Q4" ? "foundation" : "practitioner";
  if (accuracy < 0.6) return slot === "Q4" ? "foundation" : "practitioner";
  if (accuracy < 0.85) return "practitioner";
  return slot === "Q4" ? "practitioner" : "expert";
}

function pickFromPool(pool: DailyQuestion[], seed: string, excludeIds: Set<string>): DailyQuestion | null {
  if (pool.length === 0) return null;
  const eligible = pool.filter((q) => !excludeIds.has(q.id));
  const candidates = eligible.length > 0 ? eligible : pool; // pool exhausted: allow repeats
  const idx = hashString(seed) % candidates.length;
  return candidates[idx];
}

/** Picks one question for a category, preferring the target difficulty, falling back to any difficulty in that category. */
export function pickQuestion(category: DailyCategory, difficulty: DailyDifficulty, dateKey: string, recentlyUsedIds: Set<string>): DailyQuestion {
  const pool = QUESTIONS_BY_CATEGORY[category] ?? [];
  const seed = `${dateKey}:${category}:${difficulty}`;
  const exact = pool.filter((q) => q.difficulty === difficulty);
  const picked = pickFromPool(exact, seed, recentlyUsedIds) ?? pickFromPool(pool, seed, recentlyUsedIds);
  if (picked) return picked;
  // Category pool is empty (shouldn't happen with the shipped bank) — fall back to the full bank.
  return pickFromPool(DAILY_QUESTION_BANK, seed, recentlyUsedIds) ?? DAILY_QUESTION_BANK[0];
}

/** Builds today's deterministic 5-question set: EMIR, CFTC, MAS, then two rotating categories. */
export function buildDailySet(dateKey: string, accuracy: number | null, recentlyUsedIds: Set<string>): DailyQuestion[] {
  const [topicA, topicB] = rotatingCategoriesForDate(dateKey);
  const used = new Set(recentlyUsedIds);

  const pick = (category: DailyCategory, difficulty: DailyDifficulty) => {
    const q = pickQuestion(category, difficulty, dateKey, used);
    used.add(q.id);
    return q;
  };

  return [
    pick("EMIR", "practitioner"),
    pick("CFTC", "practitioner"),
    pick("MAS", "practitioner"),
    pick(topicA, difficultyForRotatingSlot(accuracy, "Q4")),
    pick(topicB, difficultyForRotatingSlot(accuracy, "Q5")),
  ];
}

/** IDs of questions answered within the last `DEDUP_WINDOW_DAYS` days, from the caller's history. */
export function recentQuestionIds(historyDateKeys: string[], questionIdsByDate: Record<string, string[]>, today: Date = new Date()): Set<string> {
  const cutoff = today.getTime() - DEDUP_WINDOW_DAYS * DAY_MS;
  const ids = new Set<string>();
  for (const dateKey of historyDateKeys) {
    if (new Date(`${dateKey}T00:00:00Z`).getTime() < cutoff) continue;
    for (const id of questionIdsByDate[dateKey] ?? []) ids.add(id);
  }
  return ids;
}

export { toDateKey };
