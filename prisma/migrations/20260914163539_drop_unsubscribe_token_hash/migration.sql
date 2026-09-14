/*
  Warnings:

  - You are about to drop the column `unsubscribeTokenHash` on the `NewsletterSubscription` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "NewsletterSubscription_unsubscribeTokenHash_key";

-- AlterTable
ALTER TABLE "NewsletterSubscription" DROP COLUMN "unsubscribeTokenHash";
