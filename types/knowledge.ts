import type { Citation, ContentStatus, ID, ISODateString, TopicSlug } from "./common";

export interface ArticleSection {
  id: string;
  heading: string;
  paragraphs: string[];
  citations: Citation[];
}

export interface KnowledgeArticle {
  id: ID;
  slug: string;
  topic: TopicSlug;
  title: string;
  summary: string;
  sections: ArticleSection[];
  relatedArticleSlugs: string[];
  lastReviewedAt: ISODateString;
  reviewedById: ID | null;
  status: ContentStatus;
  isDemo: boolean;
}

export interface ArticleVote {
  userId: ID;
  articleId: ID;
  helpful: boolean;
  createdAt: ISODateString;
}
