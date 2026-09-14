import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * GET /api/newsletter/track/click?c=campaignId&s=subscriptionId — the CTA link in campaign emails.
 * The redirect target is looked up from the campaign record itself (never from the query string),
 * so this can't be turned into an open redirect by tampering with the URL.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const campaignId = params.get("c");
  const subscriptionId = params.get("s");
  const fallback = siteUrl("/");

  if (!campaignId || !subscriptionId) return NextResponse.redirect(fallback);

  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.redirect(fallback);

  await prisma.newsletterEvent.create({ data: { campaignId, subscriptionId, type: "clicked", url: campaign.ctaUrl } }).catch(() => {});

  const target = campaign.ctaUrl.startsWith("http") ? campaign.ctaUrl : siteUrl(campaign.ctaUrl);
  return NextResponse.redirect(target);
}
