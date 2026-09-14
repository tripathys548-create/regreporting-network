-- AlterTable
ALTER TABLE "OutboundEmail" ADD COLUMN     "campaignId" TEXT,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "welcomeEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "welcomeEmailSentCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "consentSource" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "confirmationTokenHash" TEXT,
    "confirmationTokenExpiresAt" TIMESTAMP(3),
    "unsubscribeTokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT NOT NULL DEFAULT '',
    "introText" TEXT NOT NULL DEFAULT '',
    "radarHighlight" TEXT NOT NULL DEFAULT '',
    "knowledgeHighlight" TEXT NOT NULL DEFAULT '',
    "challengeHighlight" TEXT NOT NULL DEFAULT '',
    "communityHighlight" TEXT NOT NULL DEFAULT '',
    "milestoneHighlight" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT 'Visit RegWorld',
    "ctaUrl" TEXT NOT NULL DEFAULT '/',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sendDay" INTEGER NOT NULL DEFAULT 1,
    "sendTime" TEXT NOT NULL DEFAULT '09:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_confirmationTokenHash_key" ON "NewsletterSubscription"("confirmationTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_unsubscribeTokenHash_key" ON "NewsletterSubscription"("unsubscribeTokenHash");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_status_idx" ON "NewsletterSubscription"("status");

-- CreateIndex
CREATE INDEX "NewsletterSubscription_userId_idx" ON "NewsletterSubscription"("userId");

-- CreateIndex
CREATE INDEX "NewsletterCampaign_status_createdAt_idx" ON "NewsletterCampaign"("status", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterEvent_campaignId_type_idx" ON "NewsletterEvent"("campaignId", "type");

-- CreateIndex
CREATE INDEX "NewsletterEvent_subscriptionId_idx" ON "NewsletterEvent"("subscriptionId");

-- CreateIndex
CREATE INDEX "OutboundEmail_category_createdAt_idx" ON "OutboundEmail"("category", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundEmail_campaignId_idx" ON "OutboundEmail"("campaignId");

-- AddForeignKey
ALTER TABLE "NewsletterSubscription" ADD CONSTRAINT "NewsletterSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterCampaign" ADD CONSTRAINT "NewsletterCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterEvent" ADD CONSTRAINT "NewsletterEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterEvent" ADD CONSTRAINT "NewsletterEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "NewsletterSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
