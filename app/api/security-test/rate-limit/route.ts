import { NextResponse } from "next/server";
import { clientIp, limitOrNull } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Development-only route for exercising the rate limiter in integration
 * tests. Returns 404 outside development (middleware.ts also blocks
 * /api/security-test/* in production as a second layer).
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const limited = limitOrNull(`security-test-rate-limit:${clientIp(request)}`, 3, 60_000);
  if (limited) return limited;
  return NextResponse.json({ ok: true });
}
