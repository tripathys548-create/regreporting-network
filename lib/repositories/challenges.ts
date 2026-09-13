import { CHALLENGES, LEADERBOARD, QUESTIONS } from "@/data/challenges";
import type { Challenge, ChallengeQuestion, LeaderboardEntry } from "@/types";

export async function listChallenges(): Promise<Challenge[]> {
  return CHALLENGES;
}

export async function getChallengeWithQuestions(
  slug: string,
): Promise<{ challenge: Challenge; questions: ChallengeQuestion[] } | null> {
  const challenge = CHALLENGES.find((c) => c.slug === slug);
  if (!challenge) return null;
  const questions = challenge.questionIds
    .map((id) => QUESTIONS.find((q) => q.id === id))
    .filter((q): q is ChallengeQuestion => Boolean(q));
  return { challenge, questions };
}

/** Deterministic question-of-the-day so every member gets the same daily challenge. */
export async function getDailyQuestion(now: Date = new Date()): Promise<ChallengeQuestion> {
  const dayNumber = Math.floor(now.getTime() / 86_400_000);
  return QUESTIONS[dayNumber % QUESTIONS.length];
}

export async function getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  return LEADERBOARD.slice(0, limit);
}

export async function countQuestions(): Promise<number> {
  return QUESTIONS.length;
}
