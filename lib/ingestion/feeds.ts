/**
 * Official feeds polled for regulatory updates. Each URL was checked to return
 * RSS on 2026-09-13. DTCC and CPMI publish no feed — add those updates manually
 * from the admin console.
 */
export interface FeedDefinition {
  id: string;
  sourceId: string;
  label: string;
  url: string;
}

export const FEEDS: FeedDefinition[] = [
  { id: "esma-news", sourceId: "src-esma", label: "ESMA news & press releases", url: "https://www.esma.europa.eu/rss.xml" },
  { id: "fca-news", sourceId: "src-fca", label: "FCA news", url: "https://www.fca.org.uk/news/rss.xml" },
  { id: "cftc-press", sourceId: "src-cftc", label: "CFTC press releases", url: "https://www.cftc.gov/RSS/RSSGP/rssgp.xml" },
  { id: "sec-press", sourceId: "src-sec", label: "SEC press releases", url: "https://www.sec.gov/news/pressreleases.rss" },
  { id: "bis-media", sourceId: "src-bis", label: "BIS media releases", url: "https://www.bis.org/doclist/all_pressrels.rss" },
  { id: "isda-news", sourceId: "src-isda", label: "ISDA news", url: "https://www.isda.org/feed/" },
];
