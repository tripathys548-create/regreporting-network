import type { ID, ISODateString } from "./common";

export type NewsletterSubscriptionStatus = "pending" | "active" | "unsubscribed";

export interface NewsletterSubscription {
  id: ID;
  email: string;
  userId: ID | null;
  status: NewsletterSubscriptionStatus;
  consentSource: string;
  subscribedAt: ISODateString;
  confirmedAt: ISODateString | null;
  unsubscribedAt: ISODateString | null;
}

export type NewsletterCampaignStatus = "draft" | "scheduled" | "sent";

export interface NewsletterCampaign {
  id: ID;
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
  status: NewsletterCampaignStatus;
  scheduledAt: ISODateString | null;
  sentAt: ISODateString | null;
  sentCount: number;
  createdAt: ISODateString;
}

export interface NewsletterCampaignInput {
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
}

export interface NewsletterCampaignStats {
  campaignId: string;
  sent: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
}

export interface NewsletterSettings {
  enabled: boolean;
  sendDay: number;
  sendTime: string;
}

export interface NewsletterAdminOverview {
  activeSubscribers: number;
  pendingConfirmations: number;
  unsubscribed: number;
  newThisWeek: number;
  unsubscribesThisWeek: number;
}
