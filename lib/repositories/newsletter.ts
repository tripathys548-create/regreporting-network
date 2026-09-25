import { prisma } from "@/lib/db";
import { emailDeliveryConfigured } from "@/lib/email/mailer";
import { parseNewsletterCards } from "@/lib/newsletter/cards";
import type { NewsletterAdminOverview, NewsletterCampaign, NewsletterCampaignStats, NewsletterSettings } from "@/types";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

export function toCampaign(row: {
  id: string;
  title: string;
  subject: string;
  previewText: string;
  introText: string;
  radarHighlight: string;
  knowledgeHighlight: string;
  challengeHighlight: string;
  communityHighlight: string;
  milestoneHighlight: string;
  ctaLabel: string;
  ctaUrl: string;
  cards: unknown;
  audience: string;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  sentCount: number;
  createdAt: Date;
}): NewsletterCampaign {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    previewText: row.previewText,
    introText: row.introText,
    radarHighlight: row.radarHighlight,
    knowledgeHighlight: row.knowledgeHighlight,
    challengeHighlight: row.challengeHighlight,
    communityHighlight: row.communityHighlight,
    milestoneHighlight: row.milestoneHighlight,
    ctaLabel: row.ctaLabel,
    ctaUrl: row.ctaUrl,
    cards: parseNewsletterCards(row.cards),
    audience: row.audience === "members" ? "members" : "subscribers",
    status: row.status as NewsletterCampaign["status"],
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    sentAt: row.sentAt?.toISOString() ?? null,
    sentCount: row.sentCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getNewsletterAdminOverview(): Promise<NewsletterAdminOverview> {
  const weekAgo = new Date(Date.now() - WEEK_MS);
  const [activeSubscribers, pendingConfirmations, unsubscribed, newThisWeek, unsubscribesThisWeek] = await Promise.all([
    prisma.newsletterSubscription.count({ where: { status: "active" } }),
    prisma.newsletterSubscription.count({ where: { status: "pending" } }),
    prisma.newsletterSubscription.count({ where: { status: "unsubscribed" } }),
    prisma.newsletterSubscription.count({ where: { subscribedAt: { gte: weekAgo } } }),
    prisma.newsletterSubscription.count({ where: { unsubscribedAt: { gte: weekAgo } } }),
  ]);
  return { activeSubscribers, pendingConfirmations, unsubscribed, newThisWeek, unsubscribesThisWeek };
}

export async function listNewsletterCampaigns(): Promise<NewsletterCampaign[]> {
  const rows = await prisma.newsletterCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return rows.map(toCampaign);
}

export async function getNewsletterCampaign(id: string): Promise<NewsletterCampaign | null> {
  const row = await prisma.newsletterCampaign.findUnique({ where: { id } });
  return row ? toCampaign(row) : null;
}

export async function getCampaignStats(campaignId: string): Promise<NewsletterCampaignStats> {
  const [sent, opened, clicked] = await Promise.all([
    prisma.newsletterEvent.count({ where: { campaignId, type: "sent" } }),
    prisma.newsletterEvent.groupBy({ by: ["subscriptionId"], where: { campaignId, type: "opened" } }).then((r) => r.length),
    prisma.newsletterEvent.groupBy({ by: ["subscriptionId"], where: { campaignId, type: "clicked" } }).then((r) => r.length),
  ]);
  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id: campaignId } });
  const unsubscribed = campaign?.sentAt ? await prisma.newsletterSubscription.count({ where: { unsubscribedAt: { gte: campaign.sentAt } } }) : 0;
  return { campaignId, sent, opened, clicked, unsubscribed };
}

export async function getWelcomeEmailStats(): Promise<{ sent: number; delivered: number; failed: number }> {
  const [sent, failed] = await Promise.all([
    prisma.outboundEmail.count({ where: { category: "welcome", status: "sent" } }),
    prisma.outboundEmail.count({ where: { category: "welcome", status: "failed" } }),
  ]);
  return { sent: sent + failed, delivered: sent, failed };
}

export async function getNewsletterSettings(): Promise<NewsletterSettings> {
  const row = await prisma.newsletterSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} });
  return { enabled: row.enabled, sendDay: row.sendDay, sendTime: row.sendTime };
}

export function newsletterEmailConfigured(): boolean {
  return emailDeliveryConfigured();
}
