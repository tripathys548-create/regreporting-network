import { prisma } from "../lib/db";
import { sendCampaignNow } from "../lib/services/newsletterCampaigns";

/**
 * Usage: npm run newsletter:dispatch
 * Suitable for cron (e.g. hourly), same pattern as `npm run ingest`.
 *
 * Sends the earliest due "scheduled" campaign, but only when an admin has explicitly
 * enabled automatic sending in Admin → Newsletter and the current UTC day/time falls
 * within the configured send window. Nothing sends automatically until that toggle is on.
 */
async function main() {
  const settings = await prisma.newsletterSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.enabled) {
    console.log("[newsletter] Automatic sending is disabled in Admin → Newsletter. Nothing to do.");
    return;
  }

  const now = new Date();
  const currentDay = now.getUTCDay();
  const currentHm = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
  if (currentDay !== settings.sendDay || currentHm !== settings.sendTime) {
    console.log(`[newsletter] Not the configured send window (day ${settings.sendDay} at ${settings.sendTime} UTC). Current: day ${currentDay} at ${currentHm} UTC.`);
    return;
  }

  const due = await prisma.newsletterCampaign.findFirst({ where: { status: "scheduled", scheduledAt: { lte: now } }, orderBy: { scheduledAt: "asc" } });
  if (!due) {
    console.log("[newsletter] Send window reached, but no scheduled campaign is due.");
    return;
  }

  console.log(`[newsletter] Sending campaign "${due.title}" (${due.id})…`);
  const result = await sendCampaignNow(null, due.id);
  if (!result.ok) {
    console.error(`[newsletter] Failed: ${result.error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[newsletter] Sent to ${result.value.sentCount} active subscribers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
