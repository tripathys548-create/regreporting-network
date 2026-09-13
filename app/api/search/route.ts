import { NextResponse } from "next/server";
import { clientIp, limitOrNull } from "@/lib/http";
import { parseSearchFilters, searchContent } from "@/lib/search/search";

export const dynamic = "force-dynamic";

/** GET /api/search?q=&type=&source=&jurisdiction=&topic=&date= → SearchResponse */
export async function GET(request: Request) {
  const limited = limitOrNull(`search:${clientIp(request)}`, 60, 60 * 1000);
  if (limited) return limited;
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return NextResponse.json(await searchContent(parseSearchFilters(params)));
}
