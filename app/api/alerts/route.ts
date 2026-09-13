import { NextResponse } from "next/server";
import { getRegulatoryAlert } from "@/lib/repositories/updates";

export const dynamic = "force-dynamic";

/** GET /api/alerts → { alert: RegulatoryAlert | null }. Consumed by RegulatoryAlertBanner. */
export async function GET() {
  const alert = await getRegulatoryAlert();
  return NextResponse.json({ alert }, { headers: { "Cache-Control": "public, max-age=60" } });
}
