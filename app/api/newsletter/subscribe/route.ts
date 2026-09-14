import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { asRecord, clientIp, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { subscribeToNewsletter } from "@/lib/services/newsletter";

export const dynamic = "force-dynamic";

const CONSENT_SOURCES = new Set(["homepage", "footer", "regulatory-radar", "knowledge-base", "challenges", "signup"]);

/** POST /api/newsletter/subscribe { email, consent, source } — double opt-in: creates a pending subscription and emails a confirmation link. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const limited = limitOrNull(`newsletter-subscribe:${clientIp(request)}`, 8, 60 * 60 * 1000);
  if (limited) return limited;

  const { email, consent, source } = asRecord(parsed.data);
  if (typeof email !== "string" || !email.trim()) return jsonError("Enter an email address.", 422);
  if (consent !== true) return jsonError("Please confirm you agree to receive the newsletter.", 422);

  const session = await getSession();
  const consentSource = typeof source === "string" && CONSENT_SOURCES.has(source) ? source : "homepage";

  const result = await subscribeToNewsletter({ email, consentSource, userId: session?.user.id ?? null });
  if (!result.ok) return jsonError(result.error, result.status);

  return NextResponse.json({ outcome: result.value.outcome });
}
