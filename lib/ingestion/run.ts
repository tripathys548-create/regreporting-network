import { Prisma } from "@prisma/client";
import { SOURCES } from "@/data/sources";
import { prisma } from "@/lib/db";
import { classifyItem, RELEVANCE_THRESHOLD } from "./classify";
import { FEEDS, type FeedDefinition } from "./feeds";
import { parseFeed } from "./parse";

/*
 * Ingestion pipeline: fetch official feed → parse → verify the link is on the
 * source's official domain → de-duplicate by URL → classify relevance → store
 * as "pending-review" (or "archived" when not relevant). Admins publish.
 */

const TIMEOUT_MS = 20_000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS_PER_RUN = 50;
const MAX_AGE_DAYS = 120;

export interface RunSummary {
  feedId: string;
  runId: string;
  status: "ok" | "error";
  fetched: number;
  pending: number;
  archived: number;
  duplicates: number;
  skippedOld: number;
  rejected: number;
  error: string | null;
}

export interface RunOptions {
  triggeredById?: string | null;
  fetchImpl?: typeof fetch;
  now?: Date;
}

/** Identifies the platform to publishers; the SEC in particular expects a contact address. */
export function ingestionUserAgent(): string {
  const contact = process.env.INGEST_CONTACT ?? /<([^>]+)>/.exec(process.env.EMAIL_FROM ?? "")?.[1] ?? process.env.EMAIL_FROM;
  return `RegReportingNetwork/1.0${contact ? ` (${contact})` : ""}`;
}

/** Only HTTPS links on the source's own domain (or a subdomain) are accepted. */
export function isOnSourceDomain(link: string, websiteUrl: string): boolean {
  try {
    const url = new URL(link);
    const host = url.hostname.toLowerCase();
    const base = new URL(websiteUrl).hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && (host === base || host.endsWith(`.${base}`));
  } catch {
    return false;
  }
}

export function normaliseUrl(link: string): string {
  const url = new URL(link);
  url.hash = "";
  for (const key of Array.from(url.searchParams.keys())) if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  return url.toString();
}

async function fetchFeed(url: string, fetchImpl: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": ingestionUserAgent(), Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5" },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from feed`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("Feed exceeds size limit");
    const body = await res.text();
    if (body.length > MAX_BYTES) throw new Error("Feed exceeds size limit");
    return body;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureFeed(def: FeedDefinition) {
  return prisma.sourceFeed.upsert({
    where: { id: def.id },
    create: { id: def.id, sourceId: def.sourceId, label: def.label, url: def.url },
    update: {},
  });
}

export async function runFeed(feedId: string, options: RunOptions = {}): Promise<RunSummary> {
  const def = FEEDS.find((f) => f.id === feedId);
  if (!def) throw new Error(`Unknown feed: ${feedId}`);
  const source = SOURCES.find((s) => s.id === def.sourceId);
  if (!source) throw new Error(`Feed ${feedId} references unknown source ${def.sourceId}`);

  const feed = await ensureFeed(def);
  const now = options.now ?? new Date();
  const run = await prisma.ingestionRun.create({ data: { feedId: feed.id, triggeredById: options.triggeredById ?? null } });
  const counts = { fetched: 0, pending: 0, archived: 0, duplicates: 0, skippedOld: 0, rejected: 0 };

  try {
    const xml = await fetchFeed(feed.url, options.fetchImpl ?? fetch);
    const parsed = parseFeed(xml);
    const items = parsed.items.slice(0, MAX_ITEMS_PER_RUN);
    counts.fetched = items.length;

    for (const item of items) {
      if (!item.title || !item.link || !isOnSourceDomain(item.link, source.websiteUrl)) {
        counts.rejected += 1;
        continue;
      }
      const publishedAt = item.publishedAt ?? now;
      if (now.getTime() - publishedAt.getTime() > MAX_AGE_DAYS * 86_400_000) {
        counts.skippedOld += 1;
        continue;
      }

      const originalUrl = normaliseUrl(item.link);
      if (await prisma.regulatoryUpdate.findUnique({ where: { originalUrl }, select: { id: true } })) {
        counts.duplicates += 1;
        continue;
      }

      const c = classifyItem(item, source);
      const relevant = c.relevance >= RELEVANCE_THRESHOLD;
      try {
        await prisma.regulatoryUpdate.create({
          data: {
            sourceId: source.id,
            title: item.title.slice(0, 300),
            summary: item.summary || "No summary provided by the publisher — open the original source.",
            category: c.category,
            topics: c.topics,
            jurisdiction: source.jurisdiction,
            publishedAt,
            originalUrl,
            severity: c.severity,
            status: relevant ? "pending-review" : "archived",
            relevanceScore: c.relevance,
            ingestedFrom: feed.id,
            externalId: item.externalId,
            reviewNote: relevant ? (item.publishedAt ? null : "Publication date missing in feed; ingestion time used.") : `Auto-archived: relevance ${c.relevance} below threshold ${RELEVANCE_THRESHOLD}.`,
          },
        });
        if (relevant) counts.pending += 1;
        else counts.archived += 1;
      } catch (error) {
        // A concurrent run may have inserted the same URL.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") counts.duplicates += 1;
        else throw error;
      }
    }

    await prisma.$transaction([
      prisma.ingestionRun.update({ where: { id: run.id }, data: { ...counts, status: "ok", finishedAt: new Date() } }),
      prisma.sourceFeed.update({ where: { id: feed.id }, data: { lastFetchedAt: new Date(), lastStatus: "ok", lastError: null, lastItemCount: counts.fetched } }),
    ]);
    return { feedId: feed.id, runId: run.id, status: "ok", ...counts, error: null };
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    await prisma.$transaction([
      prisma.ingestionRun.update({ where: { id: run.id }, data: { ...counts, status: "error", error: message, finishedAt: new Date() } }),
      prisma.sourceFeed.update({ where: { id: feed.id }, data: { lastFetchedAt: new Date(), lastStatus: "error", lastError: message } }),
    ]);
    return { feedId: feed.id, runId: run.id, status: "error", ...counts, error: message };
  }
}

/** Runs every enabled feed sequentially (polite to publishers, simple to reason about). */
export async function runAllFeeds(options: RunOptions = {}): Promise<RunSummary[]> {
  for (const def of FEEDS) await ensureFeed(def);
  const enabled = await prisma.sourceFeed.findMany({ where: { enabled: true }, orderBy: { id: "asc" } });
  const results: RunSummary[] = [];
  for (const feed of enabled) {
    if (FEEDS.some((f) => f.id === feed.id)) results.push(await runFeed(feed.id, options));
  }
  return results;
}
