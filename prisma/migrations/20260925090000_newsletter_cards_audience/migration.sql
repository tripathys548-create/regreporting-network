-- AlterTable
ALTER TABLE "NewsletterCampaign" ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'subscribers',
ADD COLUMN     "cards" JSONB NOT NULL DEFAULT '[]';
