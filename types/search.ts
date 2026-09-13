import type { ISODateString, Jurisdiction, SourceType, TopicSlug } from "./common";

export type SearchContentType = "update" | "discussion" | "article" | "document";

export interface SearchResult {
  id: string;
  contentType: SearchContentType;
  title: string;
  excerpt: string;
  href: string;
  sourceLabel: string;
  sourceType: SourceType;
  jurisdiction: Jurisdiction | null;
  topics: TopicSlug[];
  date: ISODateString;
  isDemo: boolean;
}

export type DateRange = "any" | "30d" | "90d" | "365d";

export interface SearchFilters {
  q: string;
  type: SearchContentType | "all";
  source: string | "all";
  jurisdiction: Jurisdiction | "all";
  topic: TopicSlug | "all";
  date: DateRange;
}

export interface SearchResponse {
  query: string;
  total: number;
  counts: Record<SearchContentType, number>;
  results: SearchResult[];
}
