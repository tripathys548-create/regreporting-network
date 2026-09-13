import { prisma } from "../lib/db";
import { FEEDS } from "../lib/ingestion/feeds";

/**
 * Clean-launch setup for a production database: registers the official feeds.
 * Creates no members, discussions or demo content.
 *   npm run db:deploy && npm run setup:production && npm run ingest
 */
async function main() {
  for (const feed of FEEDS) {
    await prisma.sourceFeed.upsert({ where: { id: feed.id }, create: feed, update: { label: feed.label, url: feed.url, sourceId: feed.sourceId } });
  }
  const [feeds, users, updates] = await Promise.all([prisma.sourceFeed.count(), prisma.user.count(), prisma.regulatoryUpdate.count()]);
  console.log(`Registered ${feeds} feeds. Database has ${users} members and ${updates} regulatory updates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
