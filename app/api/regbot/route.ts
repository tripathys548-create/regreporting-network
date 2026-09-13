import { NextResponse } from "next/server";
import { clientIp, limitOrNull } from "@/lib/http";
import { regbotLiveEnabled } from "@/lib/regbot/config";
import { runLiveRegBot } from "@/lib/regbot/live";
import { runRegBotPipeline } from "@/lib/regbot/pipeline";
import type { RegBotResponse } from "@/types";

export const dynamic = "force-dynamic";

const MAX_QUESTION_LENGTH = 600;
// Mock mode only: small delay so loading states behave like a real network call.
const MOCK_LATENCY_MS = 450;
// Live answers cost money per call, so they get an hourly cap on top of the per-minute limit.
const LIVE_HOURLY_LIMIT = 40;

/**
 * POST /api/regbot  { question, sessionId? } → RegBotResponse
 *
 * Live mode (ANTHROPIC_API_KEY set) answers with Claude following the RegBot
 * specification; otherwise the demo pipeline answers from the fixed corpus.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limited = limitOrNull(`regbot:${ip}`, 20, 60 * 1000);
  if (limited) return limited;

  const live = regbotLiveEnabled();
  if (live) {
    const hourly = limitOrNull(`regbot-live:${ip}`, LIVE_HOURLY_LIMIT, 60 * 60 * 1000);
    if (hourly) return hourly;
  }

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
    const answer = live ? await runLiveRegBot(question) : await runRegBotPipeline(question);
    if (!live) await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    const sessionId = typeof raw.sessionId === "string" && raw.sessionId ? raw.sessionId : `cs-${crypto.randomUUID()}`;
    return NextResponse.json<RegBotResponse>({ ok: true, sessionId, answer });
  } catch (error) {
    console.error(`RegBot ${live ? "live" : "demo"} pipeline failed:`, error instanceof Error ? error.message : error);
    return NextResponse.json<RegBotResponse>({ ok: false, error: "RegBot could not process this question. Please try again." }, { status: 500 });
  }
}
