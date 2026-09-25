import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { renderNewsletterCampaignEmail } from "@/lib/email/templates/newsletterCampaign";
import { toCampaign } from "@/lib/repositories/newsletter";
import type { NewsletterAudience, NewsletterCampaignInput, NewsletterCard } from "@/types";
import type { ServiceResult } from "./community";

const fail = (status: number, error: string) => ({ ok: false as const, status, error });

async function audit(actorId: string | null, action: string, targetId: string, detail = "") {
  await prisma.auditLog.create({ data: { actorId, action, targetType: "newsletter-campaign", targetId, detail: detail.slice(0, 1000) } });
}

const EMPTY_INPUT: NewsletterCampaignInput = {
  title: "",
  subject: "",
  previewText: "",
  introText: "",
  radarHighlight: "",
  knowledgeHighlight: "",
  challengeHighlight: "",
  communityHighlight: "",
  milestoneHighlight: "",
  ctaLabel: "Visit RegWorld",
  ctaUrl: "/",
};

function sanitiseInput(raw: Partial<NewsletterCampaignInput>): NewsletterCampaignInput {
  const merged = { ...EMPTY_INPUT, ...raw };
  return {
    title: merged.title.slice(0, 200),
    subject: merged.subject.slice(0, 200),
    previewText: merged.previewText.slice(0, 200),
    introText: merged.introText.slice(0, 2000),
    radarHighlight: merged.radarHighlight.slice(0, 2000),
    knowledgeHighlight: merged.knowledgeHighlight.slice(0, 2000),
    challengeHighlight: merged.challengeHighlight.slice(0, 2000),
    communityHighlight: merged.communityHighlight.slice(0, 2000),
    milestoneHighlight: merged.milestoneHighlight.slice(0, 2000),
    ctaLabel: (merged.ctaLabel || "Visit RegWorld").slice(0, 60),
    ctaUrl: (merged.ctaUrl || "/").slice(0, 500),
  };
}

export async function createCampaign(actorId: string, input: Partial<NewsletterCampaignInput>): Promise<ServiceResult<{ id: string }>> {
  const data = sanitiseInput(input);
  if (!data.title.trim() || !data.subject.trim()) return fail(422, "Title and subject are required.");
  const campaign = await prisma.newsletterCampaign.create({ data: { ...data, createdById: actorId } });
  await audit(actorId, "newsletter.create", campaign.id, data.title);
  return { ok: true, value: { id: campaign.id } };
}

export async function updateCampaignDraft(actorId: string, id: string, input: Partial<NewsletterCampaignInput>): Promise<ServiceResult<{ id: string }>> {
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) return fail(404, "Campaign not found.");
  if (campaign.status === "sent") return fail(409, "This newsletter has already been sent and can no longer be edited.");

  const data = sanitiseInput({ ...campaign, ...input });
  await prisma.newsletterCampaign.update({ where: { id }, data });
  await audit(actorId, "newsletter.update", id);
  return { ok: true, value: { id } };
}

export async function scheduleCampaign(actorId: string, id: string, scheduledAt: Date): Promise<ServiceResult<{ id: string }>> {
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) return fail(404, "Campaign not found.");
  if (campaign.status === "sent") return fail(409, "This newsletter has already been sent.");
  await prisma.newsletterCampaign.update({ where: { id }, data: { status: "scheduled", scheduledAt } });
  await audit(actorId, "newsletter.schedule", id, scheduledAt.toISOString());
  return { ok: true, value: { id } };
}

export async function cancelSchedule(actorId: string, id: string): Promise<ServiceResult<{ id: string }>> {
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) return fail(404, "Campaign not found.");
  if (campaign.status === "sent") return fail(409, "This newsletter has already been sent.");
  await prisma.newsletterCampaign.update({ where: { id }, data: { status: "draft", scheduledAt: null } });
  await audit(actorId, "newsletter.unschedule", id);
  return { ok: true, value: { id } };
}

/** Sends to the admin's own address only, using a placeholder subscription id (no real tracking or unsubscribe target). */
export async function sendTestEmail(actorId: string | null, id: string, toEmail: string): Promise<ServiceResult<{ delivered: boolean }>> {
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) return fail(404, "Campaign not found.");

  const { subject, text, html } = renderNewsletterCampaignEmail(toCampaign(campaign), { campaignId: campaign.id, subscriptionId: "test-send" });
  const result = await sendEmail({ to: toEmail, subject: `[TEST] ${subject}`, text, html, category: "newsletter-campaign", campaignId: campaign.id });
  await audit(actorId, "newsletter.send-test", id, toEmail);
  return { ok: true, value: { delivered: result.delivered } };
}

const SEND_BATCH_SIZE = 25;

/**
 * Who a campaign goes to. "members" adds every verified, active member to the active subscribers;
 * a member with no subscription row gets one (consentSource "member-broadcast") so the email still
 * carries a working one-click unsubscribe and open/click tracking. Anyone who unsubscribed is skipped.
 */
async function recipientsFor(audience: string): Promise<{ id: string; email: string }[]> {
  const active = await prisma.newsletterSubscription.findMany({ where: { status: "active" }, select: { id: true, email: true } });
  if (audience !== "members") return active;

  const byEmail = new Map(active.map((r) => [r.email.toLowerCase(), r]));
  const members = await prisma.user.findMany({ where: { status: "active", emailVerifiedAt: { not: null } }, select: { id: true, email: true } });
  for (const member of members) {
    const email = member.email.toLowerCase();
    if (byEmail.has(email)) continue;
    const existing = await prisma.newsletterSubscription.findUnique({ where: { email }, select: { id: true, email: true, status: true } });
    if (existing?.status === "unsubscribed") continue;
    const row =
      existing ??
      (await prisma.newsletterSubscription.create({
        data: { email, userId: member.id, status: "active", consentSource: "member-broadcast" },
        select: { id: true, email: true },
      }));
    byEmail.set(email, { id: row.id, email: row.email });
  }
  return Array.from(byEmail.values());
}

/** Sends the campaign to its audience now (see recipientsFor). Failures for individual recipients don't stop the run.
 *  `actorId` is null for the automatic cron dispatch (recorded in the audit log as "System"). */
export async function sendCampaignNow(actorId: string | null, id: string): Promise<ServiceResult<{ sentCount: number }>> {
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) return fail(404, "Campaign not found.");
  if (campaign.status === "sent") return fail(409, "This newsletter has already been sent.");

  const subscribers = await recipientsFor(campaign.audience);
  const campaignForTemplate = toCampaign(campaign);

  let sentCount = 0;
  for (let i = 0; i < subscribers.length; i += SEND_BATCH_SIZE) {
    const batch = subscribers.slice(i, i + SEND_BATCH_SIZE);
    await Promise.all(
      batch.map(async (subscriber) => {
        const { subject, text, html } = renderNewsletterCampaignEmail(campaignForTemplate, { campaignId: campaign.id, subscriptionId: subscriber.id });
        const result = await sendEmail({ to: subscriber.email, subject, text, html, category: "newsletter-campaign", campaignId: campaign.id });
        if (result.delivered) {
          sentCount += 1;
          await prisma.newsletterEvent.create({ data: { campaignId: campaign.id, subscriptionId: subscriber.id, type: "sent" } }).catch(() => {});
        }
      }),
    );
  }

  await prisma.newsletterCampaign.update({ where: { id }, data: { status: "sent", sentAt: new Date(), sentCount } });
  await audit(actorId, "newsletter.send-now", id, `${sentCount}/${subscribers.length} delivered`);
  return { ok: true, value: { sentCount } };
}

export interface AgentCampaignInput {
  title: string;
  subject: string;
  previewText: string;
  introText: string;
  cards: NewsletterCard[];
  audience: NewsletterAudience;
}

/** Draft created by the Argus agent (no human actor). Cards are validated by the caller. */
export async function createAgentCampaign(input: AgentCampaignInput): Promise<ServiceResult<{ id: string }>> {
  const data = sanitiseInput({
    title: input.title,
    subject: input.subject,
    previewText: input.previewText,
    introText: input.introText,
    ctaLabel: "Open the Regulatory Radar",
    ctaUrl: "/radar",
  });
  if (!data.title.trim() || !data.subject.trim()) return fail(422, "Title and subject are required.");
  const campaign = await prisma.newsletterCampaign.create({
    data: { ...data, cards: input.cards as unknown as object[], audience: input.audience },
  });
  await audit(null, "newsletter.agent-create", campaign.id, `${data.title} (${input.cards.length} cards, ${input.audience})`);
  return { ok: true, value: { id: campaign.id } };
}
