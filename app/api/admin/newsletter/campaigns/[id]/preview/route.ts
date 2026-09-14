import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { renderNewsletterCampaignEmail } from "@/lib/email/templates/newsletterCampaign";
import { getNewsletterCampaign } from "@/lib/repositories/newsletter";

export const dynamic = "force-dynamic";

/** GET /api/admin/newsletter/campaigns/:id/preview — staff-only rendered HTML preview, opened in a new tab. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await authorizeApi({ staff: true });
  if (!auth.ok) return auth.response;

  const campaign = await getNewsletterCampaign(params.id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const { html } = renderNewsletterCampaignEmail(campaign, { campaignId: campaign.id, subscriptionId: "preview" });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
