import { NextResponse } from "next/server";
import { clientIp, limitOrNull } from "@/lib/http";
import { runRegBotPipeline } from "@/lib/regbot/pipeline";
import type { RegBotResponse } from "@/types";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 600;
// Mock mode only: small delay so loading states behave like a real network call.
const MOCK_LATENCY_MS = 450;

/**
 * POST /api/regbot  { question, sessionId? } → RegBotResponse
 *
 * Phase 4 keeps this contract and swaps the pipeline internals for retrieval
 * over ingested documents + LLM generation. Auth, rate limiting and session
 * persistence (ChatSession / ChatMessage) are added here in Phase 2.
 */
export async function POST(request: Request) {
  const limited = limitOrNull(`regbot:${clientIp(request)}`, 20, 60 * 1000);
  if (limited) return limited;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json<RegBotResponse>({ ok: false, error: "Request body must be JSON." }, { status: 400 });
  }

  const raw = (payload ?? {}) as { question?: unknown; sessionId?: unknown };
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) {
    return NextResponse.json<RegBotResponse>({ ok: false, error: "Enter a question." }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json<RegBotResponse>({ ok: false, error: `Questions are limited to ${MAX_QUESTION_LENGTH} characters.` }, { status: 400 });
  }

  try {
    const answer = await runRegBotPipeline(question);
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    const sessionId = typeof raw.sessionId === "string" && raw.sessionId ? raw.sessionId : `cs-${crypto.randomUUID()}`;
    return NextResponse.json<RegBotResponse>({ ok: true, sessionId, answer });
  } catch (error) {
    console.error("RegBot pipeline failed", error);
    return NextResponse.json<RegBotResponse>({ ok: false, error: "RegBot could not process this question. Please try again." }, { status: 500 });
  }
}
