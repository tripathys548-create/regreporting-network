import { NextResponse } from "next/server";
import { authorizeAgent } from "@/lib/auth/agentToken";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent/updates?days=7 — real (non-demo) regulatory updates published in the window,
 * whatever their review queue (pending-review, published or archived), rejected excluded.
 * Source material for the weekly newsletter.
 */
export async function GET(request: Request) {
  const denied = authorizeAgent(request);
  if (denied) return denied;

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days")) || 7, 1), 31);
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await prisma.regulatoryUpdate.findMany({
    where: { isDemo: false, status: { not: "rejected" }, publishedAt: { gte: since } },
    orderBy: [{ relevanceScore: "desc" }, { publishedAt: "desc" }],
    take: 80,
    select: { sourceId: true, title: true, summary: true, category: true, topics: true, jurisdiction: true, publishedAt: true, originalUrl: true, severity: true, status: true, relevanceScore: true },
  });
  return NextResponse.json({ since: since.toISOString(), count: rows.length, updates: rows });
}
