import { NextResponse } from "next/server";
import { authorizeAgent } from "@/lib/auth/agentToken";
import { prisma } from "@/lib/db";
import { asRecord, jsonError, readJson } from "@/lib/http";
import { validateNewsletterCards } from "@/lib/newsletter/cards";
import { createAgentCampaign, sendCampaignNow, sendTestEmail } from "@/lib/services/newsletterCampaigns";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const RESEND_GUARD_MS = 5 * 86_400_000;

/**
 * POST /api/agent/newsletter — Argus's weekly digest.
 * Body: { title, subject, previewText?, introText?, cards: NewsletterCard[], audience?: "members"|"subscribers",
 *         mode: "draft" | "test" | "send", testEmail?, force? }
 * "test" creates the draft and sends a [TEST] copy to testEmail only. "send" creates and sends to the
 * audience, but refuses if an agent campaign already went out in the last 5 days (unless force: true),
 * so a retried cron run can't email every member twice.
 */
export async function POST(request: Request) {
  const denied = authorizeAgent(request);
  if (denied) return denied;
  const parsed = await readJson(request);
  if (!parsed.ok) return parsed.response;
  const body = asRecord(parsed.data);

  const mode = body.mode === "send" || body.mode === "test" ? body.mode : "draft";
  const audience = body.audience === "subscribers" ? "subscribers" : "members";
  const cards = validateNewsletterCards(body.cards);
  if (!cards.ok) return jsonError("Invalid cards.", 422, { errors: cards.errors });

  const testEmail = typeof body.testEmail === "string" ? body.testEmail.trim() : "";
  if (mode === "test" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) return jsonError("testEmail is required for mode=test.", 422);

  if (mode === "send" && body.force !== true) {
    const recent = await prisma.newsletterCampaign.findFirst({
      where: { status: "sent", createdById: null, sentAt: { gte: new Date(Date.now() - RESEND_GUARD_MS) } },
      select: { id: true, title: true, sentAt: true },
    });
    if (recent) return jsonError(`A newsletter was already sent on ${recent.sentAt?.toISOString()} ("${recent.title}").`, 409, { campaignId: recent.id });
  }

  const created = await createAgentCampaign({
    title: String(body.title ?? ""),
    subject: String(body.subject ?? ""),
    previewText: String(body.previewText ?? ""),
    introText: String(body.introText ?? ""),
    cards: cards.cards,
    audience,
  });
  if (!created.ok) return jsonError(created.error, created.status);
  const id = created.value.id;

  if (mode === "test") {
    const test = await sendTestEmail(null, id, testEmail);
    return NextResponse.json({ id, mode, delivered: test.ok && test.value.delivered });
  }
  if (mode === "send") {
    const sent = await sendCampaignNow(null, id);
    if (!sent.ok) return jsonError(sent.error, sent.status, { id });
    return NextResponse.json({ id, mode, sentCount: sent.value.sentCount });
  }
  return NextResponse.json({ id, mode });
}
