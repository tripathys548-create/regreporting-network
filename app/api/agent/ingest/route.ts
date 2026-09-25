import { NextResponse } from "next/server";
import { authorizeAgent } from "@/lib/auth/agentToken";
import { runAllFeeds } from "@/lib/ingestion/run";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** POST /api/agent/ingest — fetch every official feed now so the newsletter sees this week's items. */
export async function POST(request: Request) {
  const denied = authorizeAgent(request);
  if (denied) return denied;
  const results = await runAllFeeds({ triggeredById: null });
  return NextResponse.json({ results });
}
