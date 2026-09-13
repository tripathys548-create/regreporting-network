import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { clientIp, rejectCrossOrigin } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";
import { regbotLiveEnabled } from "@/lib/regbot/config";
import { runLiveRegBot } from "@/lib/regbot/live";
import { runReferenceRegBot } from "@/lib/regbot/reference";
import { securityConfig } from "@/lib/security/config";
import { recordSecurityEvent } from "@/lib/security/events";
import { newRequestId } from "@/lib/security/requestId";
import { rejectIfRestricted } from "@/lib/security/guard";
import type { RegBotResponse } from "@/types";

export const dynamic = "force-dynamic";

// Reference mode only: small delay so loading states behave like a real network call.
const MOCK_LATENCY_MS = 350;
const DAY_MS = 24 * 60 * 60 * 1000;

function fail(error: string, status: number, requestId: string) {
  return NextResponse.json<RegBotResponse & { requestId?: string }>({ ok: false, error, requestId }, { status, headers: { "X-Request-Id": requestId } });
}

/**
 * POST /api/regbot  { question, sessionId? } → RegBotResponse
 *
 * Protected at both edge (Cloudflare rate limiting — see docs/CLOUDFLARE_SETUP.md)
 * and application level: per-minute + per-hour(live) rate limits, a per-tier
 * daily quota, request-size cap, and progressive restriction enforcement.
 *
 * Default (free): prewritten reference library. Optional
 * paid live mode (ANTHROPIC_API_KEY set) answers with Claude using the same specification.
 */
export async function POST(request: Request) {
  const requestId = newRequestId();
  const ip = clientIp(request);

  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > securityConfig.maxRequestBytes.regbot) return fail("Request too large.", 413, requestId);

  const session = await getSession();
  const userId = session?.user.id ?? null;
  const tier: "anonymous" | "member" | "admin" = !session ? "anonymous" : session.user.role === "admin" ? "admin" : "member";

  const restricted = await rejectIfRestricted({ requestId, ip, userId, route: "/api/regbot" });
  if (restricted) return restricted;

  const minuteKey = `regbot:${userId ?? ip}`;
  const minute = rateLimit(minuteKey, securityConfig.rateLimits.regbotPerMinute.limit, securityConfig.rateLimits.regbotPerMinute.windowMs);
  if (!minute.ok) {
    await recordSecurityEvent({ requestId, eventType: "RATE_LIMIT_EXCEEDED", ip, userId, route: "/api/regbot", detail: "per-minute limit" });
    return fail(`Too many requests. Try again in ${minute.retryAfterSec} seconds.`, 429, requestId);
  }

  const dailyQuota = securityConfig.regbotQuotas[tier];
  const dailyKey = `regbot-daily:${userId ?? ip}`;
  const daily = rateLimit(dailyKey, dailyQuota, DAY_MS);
  if (!daily.ok) {
    await recordSecurityEvent({ requestId, eventType: "REGBOT_QUOTA_EXCEEDED", ip, userId, route: "/api/regbot", detail: `tier=${tier} quota=${dailyQuota}` });
    return fail(`Daily question limit reached (${dailyQuota}/day for your account tier). Try again tomorrow.`, 429, requestId);
  }

  const live = regbotLiveEnabled();
  if (live) {
    const hourly = rateLimit(`regbot-live:${userId ?? ip}`, securityConfig.rateLimits.regbotLivePerHour.limit, securityConfig.rateLimits.regbotLivePerHour.windowMs);
    if (!hourly.ok) {
      await recordSecurityEvent({ requestId, eventType: "RATE_LIMIT_EXCEEDED", ip, userId, route: "/api/regbot", detail: "live hourly limit" });
      return fail(`Too many requests. Try again in ${hourly.retryAfterSec} seconds.`, 429, requestId);
    }
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("Request body must be JSON.", 400, requestId);
  }

  const raw = (payload ?? {}) as { question?: unknown; sessionId?: unknown };
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) return fail("Enter a question.", 400, requestId);
  if (question.length > securityConfig.regbotQuotas.maxQuestionLength) {
    return fail(`Questions are limited to ${securityConfig.regbotQuotas.maxQuestionLength} characters.`, 400, requestId);
  }

  try {
    const answer = live ? await runLiveRegBot(question) : await runReferenceRegBot(question);
    if (!live) await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    const sessionId = typeof raw.sessionId === "string" && raw.sessionId ? raw.sessionId : `cs-${crypto.randomUUID()}`;
    return NextResponse.json<RegBotResponse>({ ok: true, sessionId, answer }, { headers: { "X-Request-Id": requestId } });
  } catch (error) {
    console.error(`[${requestId}] RegBot ${live ? "live" : "demo"} pipeline failed:`, error instanceof Error ? error.message : error);
    await recordSecurityEvent({ requestId, eventType: "APPLICATION_ERROR", ip, userId, route: "/api/regbot", detail: "pipeline failure" });
    return fail("RegBot could not process this question. Please try again.", 500, requestId);
  }
}
