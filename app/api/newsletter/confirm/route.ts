import { NextResponse } from "next/server";
import { clientIp, limitOrNull } from "@/lib/http";
import { confirmNewsletterSubscription } from "@/lib/services/newsletter";

export const dynamic = "force-dynamic";

/** GET /api/newsletter/confirm?token=... — one-click double opt-in confirmation link from the confirmation email. */
export async function GET(request: Request) {
  const limited = limitOrNull(`newsletter-confirm:${clientIp(request)}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = token ? await confirmNewsletterSubscription(token) : "invalid";

  return NextResponse.redirect(new URL(`/newsletter/confirm?result=${result}`, request.url));
}
