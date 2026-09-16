import { prisma } from "@/lib/db";

export const SHARE_CONTENT_TYPES = ["discussion", "regulatory-update", "knowledge-article"] as const;
export type ShareContentType = (typeof SHARE_CONTENT_TYPES)[number];

export const SHARE_METHODS = ["copy-link", "whatsapp", "linkedin", "email", "x", "native-share"] as const;
export type ShareMethod = (typeof SHARE_METHODS)[number];

export async function recordShareEvent(input: { contentType: ShareContentType; contentId: string; method: ShareMethod; userId: string | null }): Promise<void> {
  await prisma.shareEvent.create({ data: input });
}
