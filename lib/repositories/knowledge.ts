import { ARTICLES } from "@/data/knowledge";
import type { KnowledgeArticle } from "@/types";

export async function listArticles(): Promise<KnowledgeArticle[]> {
  return ARTICLES.filter((a) => a.status === "published");
}

export async function getArticleBySlug(slug: string): Promise<KnowledgeArticle | null> {
  return ARTICLES.find((a) => a.slug === slug && a.status === "published") ?? null;
}

export async function getArticlesBySlugs(slugs: string[]): Promise<KnowledgeArticle[]> {
  return slugs.map((s) => ARTICLES.find((a) => a.slug === s)).filter((a): a is KnowledgeArticle => Boolean(a));
}
