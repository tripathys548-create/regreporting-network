import { prisma } from "../lib/db";
import { runAllFeeds, runFeed } from "../lib/ingestion/run";

/**
 * Usage:
 *   npm run ingest            # all enabled feeds
 *   npm run ingest -- fca-news
 * Suitable for cron/launchd. New items land in Admin → Regulatory Updates for review.
 */
async function main() {
  const feedId = process.argv[2];
  const results = feedId ? [await runFeed(feedId)] : await runAllFeeds();
  console.table(
    results.map((r) => ({ feed: r.feedId, status: r.status, fetched: r.fetched, pending: r.pending, archived: r.archived, duplicates: r.duplicates, old: r.skippedOld, rejected: r.rejected, error: r.error ?? "" })),
  );
  if (results.some((r) => r.status === "error")) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
