import { XMLParser } from "fast-xml-parser";
import { extractEmbeddedDate, parseFeedDate } from "./dates";

export type FeedFormat = "rss2" | "rdf" | "atom";

export interface FeedItem {
  title: string;
  link: string;
  summary: string;
  publishedAt: Date | null;
  externalId: string | null;
  categories: string[];
}

export interface ParsedFeed {
  format: FeedFormat;
  items: FeedItem[];
}

export class FeedParseError extends Error {}

const SUMMARY_MAX = 400;

// fast-xml-parser does not resolve external entities or DTDs, so XXE is not possible.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  htmlEntities: true,
  isArray: (name) => ["item", "entry", "category", "link"].includes(name),
});

type Node = Record<string, unknown>;

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return text(value[0]);
  if (typeof value === "object" && "#text" in (value as Node)) return text((value as Node)["#text"]);
  return "";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
      if (code.startsWith("#x")) return String.fromCodePoint(parseInt(code.slice(2), 16));
      if (code.startsWith("#")) return String.fromCodePoint(parseInt(code.slice(1), 10));
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(raw: string): string {
  return stripHtml(raw).replace(/\s+/g, " ").trim();
}

/** Plain-text summary without the repeated title, date lines or "Read more" links. */
export function cleanSummary(rawHtml: string, title: string): string {
  let summary = stripHtml(rawHtml)
    .replace(/Read more.*$/i, "")
    .trim();
  if (title && summary.toLowerCase().startsWith(title.toLowerCase())) summary = summary.slice(title.length).trim();
  summary = summary
    .replace(/^\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\s*/, "")
    .replace(/^(Press Releases?|News|Speeches|Statements?)\s+/i, "")
    .trim();
  if (summary.length <= SUMMARY_MAX) return summary;
  return `${summary.slice(0, SUMMARY_MAX).replace(/\s+\S*$/, "")}…`;
}

function atomLink(links: unknown): string {
  const list = Array.isArray(links) ? (links as Node[]) : [];
  const preferred = list.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") ?? list[0];
  return preferred ? text(preferred["@_href"]) : "";
}

function toItem(node: Node, format: FeedFormat): FeedItem {
  const title = cleanTitle(text(node.title));
  const rawDescription = format === "atom" ? text(node.summary) || text(node.content) : text(node.description) || text(node["content:encoded"]);
  const link = (format === "atom" ? atomLink(node.link) : text(node.link)).trim();
  const dateRaw = format === "atom" ? text(node.published) || text(node.updated) : text(node.pubDate) || text(node["dc:date"]);
  const guid = format === "atom" ? text(node.id) : text(node.guid) || text(node["@_rdf:about"]);
  const categories = (Array.isArray(node.category) ? node.category : []).map((c) => stripHtml(text(c) || text((c as Node)["@_term"]))).filter(Boolean);

  return {
    title,
    link,
    summary: cleanSummary(rawDescription, title),
    publishedAt: parseFeedDate(dateRaw) ?? extractEmbeddedDate(rawDescription),
    externalId: guid || null,
    categories,
  };
}

export function parseFeed(xml: string): ParsedFeed {
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch (error) {
    throw new FeedParseError(`Invalid XML: ${error instanceof Error ? error.message : "unknown error"}`);
  }

  const rss = doc.rss as Node | undefined;
  if (rss?.channel) {
    const items = ((rss.channel as Node).item as Node[] | undefined) ?? [];
    return { format: "rss2", items: items.map((i) => toItem(i, "rss2")) };
  }
  const rdf = doc["rdf:RDF"] as Node | undefined;
  if (rdf) return { format: "rdf", items: ((rdf.item as Node[] | undefined) ?? []).map((i) => toItem(i, "rdf")) };
  const feed = doc.feed as Node | undefined;
  if (feed) return { format: "atom", items: ((feed.entry as Node[] | undefined) ?? []).map((i) => toItem(i, "atom")) };

  throw new FeedParseError("Unrecognised feed format (expected RSS 2.0, RSS 1.0/RDF or Atom).");
}
