import { ARTICLES } from "@/data/knowledge";
import { prisma } from "@/lib/db";
import { DOCUMENTS } from "@/data/documents";
import { SOURCES } from "@/data/sources";
import { isTopicSlug } from "@/data/topics";
import { DEMO_SECTIONS_ENABLED } from "@/lib/features";
import { excerpt, termsMatch, tokenize } from "@/lib/text";
import type { DateRange, Jurisdiction, SearchContentType, SearchFilters, SearchResponse, SearchResult, TopicSlug } from "@/types";

/*
 * Search over static regulatory content (in-memory) and live community content
 * (database). Phase 3 moves both to Postgres full-text search; the
 * SearchFilters → SearchResponse contract stays the same.
 */

interface IndexedDoc {
  result: SearchResult;
  titleTokens: string[];
  bodyTokens: string[];
}

const sourceName = (id: string) => SOURCES.find((s) => s.id === id)?.shortName ?? "Unknown";
const sourceJurisdiction = (id: string): Jurisdiction | null => SOURCES.find((s) => s.id === id)?.jurisdiction ?? null;

function buildIndex(): IndexedDoc[] {
  const docs: IndexedDoc[] = [];
  const add = (result: SearchResult, body: string) =>
    docs.push({ result, titleTokens: tokenize(result.title), bodyTokens: tokenize(`${body} ${result.topics.join(" ")}`) });

  for (const a of ARTICLES.filter((a) => a.status === "published")) {
    const text = a.sections.map((s) => `${s.heading} ${s.paragraphs.join(" ")}`).join(" ");
    add(
      { id: a.id, contentType: "article", title: a.title, excerpt: excerpt(a.summary), href: `/knowledge/${a.slug}`, sourceLabel: "Knowledge Base", sourceType: "industry-guidance", jurisdiction: null, topics: [a.topic], date: a.lastReviewedAt, isDemo: a.isDemo },
      `${a.summary} ${text}`,
    );
  }
  for (const doc of DOCUMENTS) {
    add(
      { id: doc.id, contentType: "document", title: doc.title, excerpt: `${sourceName(doc.sourceId)} · ${doc.documentType.replace(/-/g, " ")}`, href: doc.url, sourceLabel: sourceName(doc.sourceId), sourceType: doc.sourceType, jurisdiction: sourceJurisdiction(doc.sourceId), topics: [], date: doc.publishedAt, isDemo: doc.isDemo },
      doc.documentType,
    );
  }
  return docs;
}

// Static content (articles, documents) is sample content: indexed once per process, and only when demo sections are shown.
let cachedIndex: IndexedDoc[] | null = null;
const getStaticIndex = () => (DEMO_SECTIONS_ENABLED ? (cachedIndex ??= buildIndex()) : []);

/** Community content is read from the database on every search, including reply text. */
async function buildDiscussionIndex(): Promise<IndexedDoc[]> {
  const rows = await prisma.discussion.findMany({
    where: { status: "published" },
    select: { id: true, slug: true, title: true, body: true, tags: true, category: true, lastActivityAt: true, comments: { where: { status: "published" }, select: { body: true } } },
  });
  return rows.map((d) => {
    const topics = isTopicSlug(d.category) ? [d.category as TopicSlug] : [];
    const result: SearchResult = {
      id: d.id,
      contentType: "discussion",
      title: d.title,
      excerpt: excerpt(d.body),
      href: `/community/${d.slug}`,
      sourceLabel: "Community",
      sourceType: "community-interpretation",
      jurisdiction: null,
      topics,
      date: d.lastActivityAt.toISOString(),
      isDemo: false,
    };
    return { result, titleTokens: tokenize(d.title), bodyTokens: tokenize(`${d.body} ${d.tags.join(" ")} ${d.comments.map((c) => c.body).join(" ")} ${topics.join(" ")}`) };
  });
}

/** Published regulatory updates (ingested and approved, or demo). */
async function buildUpdateIndex(): Promise<IndexedDoc[]> {
  const rows = await prisma.regulatoryUpdate.findMany({ where: { status: "published" }, orderBy: { publishedAt: "desc" }, take: 2000 });
  return rows.map((u) => {
    const source = SOURCES.find((s) => s.id === u.sourceId);
    const topics = u.topics.filter(isTopicSlug) as TopicSlug[];
    const result: SearchResult = {
      id: u.id,
      contentType: "update",
      title: u.title,
      excerpt: excerpt(u.summary),
      href: `/radar/${u.id}`,
      sourceLabel: source?.shortName ?? "Unknown",
      sourceType: source?.sourceType ?? "regulatory-requirement",
      jurisdiction: (source?.jurisdiction ?? null) as Jurisdiction | null,
      topics,
      date: u.publishedAt.toISOString(),
      isDemo: u.isDemo,
    };
    return { result, titleTokens: tokenize(u.title), bodyTokens: tokenize(`${u.summary} ${topics.join(" ")}`) };
  });
}

const DATE_DAYS: Record<Exclude<DateRange, "any">, number> = { "30d": 30, "90d": 90, "365d": 365 };

function score(doc: IndexedDoc, queryTokens: string[]): number {
  let total = 0;
  for (const q of queryTokens) {
    const inTitle = doc.titleTokens.some((t) => termsMatch(t, q));
    const inBody = doc.bodyTokens.some((t) => termsMatch(t, q));
    if (!inTitle && !inBody) return 0; // every term must match somewhere
    total += (inTitle ? 3 : 0) + (inBody ? 1 : 0);
  }
  return total;
}

export const EMPTY_COUNTS: Record<SearchContentType, number> = { update: 0, discussion: 0, article: 0, document: 0 };

export function parseSearchFilters(params: Record<string, string | string[] | undefined>): SearchFilters {
  const get = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const type = get("type");
  const jurisdiction = get("jurisdiction");
  const topic = get("topic");
  const date = get("date");
  return {
    q: get("q").slice(0, 200),
    type: (["update", "discussion", "article", "document"] as const).find((t) => t === type) ?? "all",
    source: get("source") || "all",
    jurisdiction: (["EU", "UK", "US", "Global"] as const).find((j) => j === jurisdiction) ?? "all",
    topic: isTopicSlug(topic) ? (topic as TopicSlug) : "all",
    date: (["30d", "90d", "365d"] as const).find((d) => d === date) ?? "any",
  };
}

export async function searchContent(filters: SearchFilters, now: Date = new Date()): Promise<SearchResponse> {
  const queryTokens = tokenize(filters.q);
  if (queryTokens.length === 0) return { query: filters.q, total: 0, counts: { ...EMPTY_COUNTS }, results: [] };

  const [updates, discussions] = await Promise.all([buildUpdateIndex(), buildDiscussionIndex()]);
  const index = [...getStaticIndex(), ...updates, ...discussions];
  const matches = index
    .map((doc) => ({ doc, score: score(doc, queryTokens) }))
    .filter(({ doc, score }) => {
      if (score === 0) return false;
      const r = doc.result;
      if (filters.source !== "all" && r.sourceLabel.toLowerCase() !== filters.source.toLowerCase()) return false;
      if (filters.jurisdiction !== "all" && r.jurisdiction !== filters.jurisdiction) return false;
      if (filters.topic !== "all" && !r.topics.includes(filters.topic)) return false;
      if (filters.date !== "any" && now.getTime() - new Date(r.date).getTime() > DATE_DAYS[filters.date] * 86_400_000) return false;
      return true;
    });

  // Counts ignore the type filter so the type tabs always show what is available.
  const counts = { ...EMPTY_COUNTS };
  for (const { doc } of matches) counts[doc.result.contentType] += 1;

  const results = matches
    .filter(({ doc }) => filters.type === "all" || doc.result.contentType === filters.type)
    .sort((a, b) => b.score - a.score || b.doc.result.date.localeCompare(a.doc.result.date))
    .map(({ doc }) => doc.result);

  return { query: filters.q, total: results.length, counts, results };
}
