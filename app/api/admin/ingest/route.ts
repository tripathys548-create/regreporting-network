import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { FEEDS } from "@/lib/ingestion/feeds";
import { runAllFeeds, runFeed } from "@/lib/ingestion/run";
import { asRecord, jsonError, limitOrNull, parseMutation } from "@/lib/http";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/admin/ingest { feedId? } — fetch official feeds now. Admin only. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`ingest:${auth.session.user.id}`, 6, 10 * 60 * 1000);
  if (limited) return limited;

  const { feedId } = asRecord(parsed.data);
  if (feedId !== undefined && !FEEDS.some((f) => f.id === feedId)) return jsonError("Unknown feed.", 400);

  const options = { triggeredById: auth.session.user.id };
  const results = typeof feedId === "string" ? [await runFeed(feedId, options)] : await runAllFeeds(options);
  return NextResponse.json({ results });
}
