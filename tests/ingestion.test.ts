import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyItem, RELEVANCE_THRESHOLD } from "../lib/ingestion/classify";
import { parseFeedDate } from "../lib/ingestion/dates";
import { cleanSummary, parseFeed, stripHtml } from "../lib/ingestion/parse";
import { isOnSourceDomain, normaliseUrl } from "../lib/ingestion/run";

// Fixtures mirror the structure of the real feeds (content shortened and invented).
const RSS2 = `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>CFTC</title>
<item><title>  CFTC Approves Final Rule on Swap Data Reporting  </title><link>https://www.cftc.gov/PressRoom/PressReleases/1-26</link>
<description/><pubDate>Fri, 11 Sep 2026 18:08:58 +0000</pubDate><guid isPermaLink="true">https://www.cftc.gov/PressRoom/PressReleases/1-26</guid></item>
</channel></rss>`;

const ESMA = `<?xml version="1.0"?><rss version="2.0" xml:base="https://www.esma.europa.eu/"><channel><title>ESMA</title>
<item><title>ESMA confirms go-live for weekly commodity derivatives position reporting</title><link>https://www.esma.europa.eu/press-news/esma-news/example</link>
<description>&lt;span&gt;ESMA confirms go-live for weekly commodity derivatives position reporting&lt;/span&gt;
&lt;span&gt;&lt;time datetime="2026-09-10T10:25:31+02:00"&gt;10 September 2026&lt;/time&gt;&lt;/span&gt;
&lt;div&gt;Press Releases&lt;/div&gt;&lt;p&gt;Trading venues will submit reports weekly &amp;amp; on time.&lt;/p&gt;</description></item>
</channel></rss>`;

const RDF = `<?xml version="1.0" encoding="utf-8"?><rdf:RDF xmlns="http://purl.org/rss/1.0/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel rdf:about="https://www.bis.org/doclist/all_pressrels.rss"><title>Media releases</title></channel>
<item rdf:about="https://www.bis.org/media-releases/example"><title>CPMI and IOSCO publish report on critical data elements</title><link>https://www.bis.org/media-releases/example</link>
<description>Report on harmonisation of OTC derivatives data.</description><dc:date>2026-09-08T09:00:00Z</dc:date></item></rdf:RDF>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Example</title>
<entry><title>Atom entry</title><link rel="alternate" href="https://www.isda.org/2026/09/09/entry/"/><id>tag:isda,1</id><updated>2026-09-09T13:54:12Z</updated><summary>Short summary</summary></entry></feed>`;

describe("parseFeed", () => {
  it("parses RSS 2.0 and trims titles", () => {
    const feed = parseFeed(RSS2);
    assert.equal(feed.format, "rss2");
    assert.equal(feed.items.length, 1);
    assert.equal(feed.items[0].title, "CFTC Approves Final Rule on Swap Data Reporting");
    assert.equal(feed.items[0].publishedAt?.toISOString(), "2026-09-11T18:08:58.000Z");
  });

  it("extracts ESMA dates from escaped HTML and cleans the summary", () => {
    const item = parseFeed(ESMA).items[0];
    assert.equal(item.publishedAt?.toISOString(), "2026-09-10T08:25:31.000Z");
    assert.equal(item.summary, "Trading venues will submit reports weekly & on time.");
  });

  it("parses RSS 1.0 / RDF (BIS)", () => {
    const feed = parseFeed(RDF);
    assert.equal(feed.format, "rdf");
    assert.equal(feed.items[0].link, "https://www.bis.org/media-releases/example");
    assert.equal(feed.items[0].publishedAt?.toISOString(), "2026-09-08T09:00:00.000Z");
  });

  it("parses Atom", () => {
    const item = parseFeed(ATOM).items[0];
    assert.equal(item.link, "https://www.isda.org/2026/09/09/entry/");
    assert.equal(item.externalId, "tag:isda,1");
  });

  it("rejects unknown documents", () => {
    assert.throws(() => parseFeed("<html><body>not a feed</body></html>"));
  });
});

describe("dates", () => {
  it("parses the FCA Drupal format", () => {
    assert.equal(parseFeedDate("Thursday, September 10, 2026 - 15:04")?.toISOString(), "2026-09-10T15:04:00.000Z");
  });
  it("returns null for garbage", () => {
    assert.equal(parseFeedDate("not a date"), null);
  });
});

describe("html cleaning", () => {
  it("strips tags, scripts and entities", () => {
    assert.equal(stripHtml("<p>A &amp; B<script>x()</script> &#8211; C</p>"), "A & B – C");
  });
  it("removes repeated titles and read-more links", () => {
    assert.equal(cleanSummary("Title here A compendium of links... <a>Read more</a>", "Title here"), "A compendium of links...");
  });
});

describe("classifyItem", () => {
  const esma = { jurisdiction: "EU" as const, slug: "esma" as const };
  const fca = { jurisdiction: "UK" as const, slug: "fca" as const };
  const cftc = { jurisdiction: "US" as const, slug: "cftc" as const };

  it("marks reporting items as relevant", () => {
    const c = classifyItem({ title: "ESMA confirms go-live for weekly commodity derivatives position reporting", summary: "" }, esma);
    assert.ok(c.relevance >= RELEVANCE_THRESHOLD);
    assert.equal(c.category, "mifir");
    assert.equal(c.severity, "high");
  });

  it("archives unrelated enforcement news", () => {
    const c = classifyItem({ title: "Man pleads guilty to fraud and forgery offences", summary: "Sentencing will follow." }, fca);
    assert.ok(c.relevance < RELEVANCE_THRESHOLD);
  });

  it("maps FCA EMIR items to UK EMIR", () => {
    const c = classifyItem({ title: "FCA publishes EMIR reporting Q&As", summary: "" }, fca);
    assert.equal(c.category, "uk-emir");
    assert.ok(!c.topics.includes("emir"));
  });

  it("does not apply EU topics to US sources", () => {
    const c = classifyItem({ title: "CFTC staff letter on swap data reporting and MiFID equivalence", summary: "" }, cftc);
    assert.equal(c.category, "cftc");
    assert.ok(!c.topics.includes("mifir"));
  });

  // Regression cases taken from real headlines seen in the first live ingestion (2026-09-13).
  it("does not queue generic rule-making unrelated to reporting", () => {
    assert.ok(classifyItem({ title: "CFTC Approves Final Rule Concerning Whistleblower Awards", summary: "" }, cftc).relevance < RELEVANCE_THRESHOLD);
    assert.ok(
      classifyItem({ title: "ESMA consults on disclosure requirements and updates guidelines and Q&As under the Prospectus Regulation", summary: "" }, esma).relevance < RELEVANCE_THRESHOLD,
    );
  });

  it("queues swap clearing requirement rules", () => {
    const c = classifyItem({ title: "CFTC Issues Final Rule to Modify Clearing Requirement for Canadian Dollar- and Mexican Peso-Denominated Swaps", summary: "" }, cftc);
    assert.ok(c.relevance >= RELEVANCE_THRESHOLD);
    assert.equal(c.category, "cftc");
  });

  it("queues reporting consultations and picks the specific topic", () => {
    const c = classifyItem({ title: "ESMA consults on reporting framework for clearing activity at recognised third-country CCPs", summary: "" }, esma);
    assert.ok(c.relevance >= RELEVANCE_THRESHOLD);
    assert.equal(c.category, "emir");
  });

  it("matches short identifiers only as whole words", () => {
    const c = classifyItem({ title: "Guidance on LEI renewal", summary: "Relevant to utilities and multilevel structures" }, esma);
    assert.ok(c.topics.includes("lei"));
    assert.ok(!c.topics.includes("uti"));
  });
});

describe("link safety", () => {
  it("accepts official domains and subdomains over HTTPS", () => {
    assert.ok(isOnSourceDomain("https://www.esma.europa.eu/press-news/x", "https://www.esma.europa.eu"));
    assert.ok(isOnSourceDomain("https://register.fca.org.uk/x", "https://www.fca.org.uk"));
  });
  it("rejects look-alike domains and plain HTTP", () => {
    assert.ok(!isOnSourceDomain("https://esma.europa.eu.evil.example/x", "https://www.esma.europa.eu"));
    assert.ok(!isOnSourceDomain("http://www.sec.gov/x", "https://www.sec.gov"));
  });
  it("strips tracking parameters and fragments", () => {
    assert.equal(normaliseUrl("https://www.sec.gov/a?utm_source=rss&id=2#top"), "https://www.sec.gov/a?id=2");
  });
});
