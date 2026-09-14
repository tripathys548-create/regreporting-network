import { NextResponse } from "next/server";
import { clientIp, limitOrNull } from "@/lib/http";
import { unsubscribeBySubscriptionToken } from "@/lib/services/newsletter";

export const dynamic = "force-dynamic";

/** GET /api/newsletter/unsubscribe?s=subscriptionId&t=hmac — one-click link included in every newsletter email. */
export async function GET(request: Request) {
  const limited = limitOrNull(`newsletter-unsubscribe:${clientIp(request)}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const subscriptionId = params.get("s") ?? "";
  const token = params.get("t") ?? "";
  const result = subscriptionId && token ? await unsubscribeBySubscriptionToken(subscriptionId, token) : "invalid";

  return NextResponse.redirect(new URL(`/newsletter/unsubscribed?result=${result}`, request.url));
}
