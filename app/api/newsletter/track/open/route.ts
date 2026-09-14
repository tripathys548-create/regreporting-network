import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF, served regardless of whether the event was recorded (never break image rendering).
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

/** GET /api/newsletter/track/open?c=campaignId&s=subscriptionId — embedded as a 1x1 pixel in campaign emails. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const campaignId = params.get("c");
  const subscriptionId = params.get("s");

  if (campaignId && subscriptionId) {
    const already = await prisma.newsletterEvent.findFirst({ where: { campaignId, subscriptionId, type: "opened" } });
    if (!already) {
      await prisma.newsletterEvent.create({ data: { campaignId, subscriptionId, type: "opened" } }).catch(() => {});
    }
  }

  return new NextResponse(PIXEL, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
