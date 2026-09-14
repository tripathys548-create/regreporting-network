import { unsubscribeTokenFor } from "@/lib/newsletter/tokens";
import { siteUrl } from "@/lib/site";
import type { NewsletterCampaign } from "@/types";
import { button, buttonText, emailColors, escapeHtml, renderEmailLayout } from "./layout";

const { INK, BODY, MUTED, LINE } = emailColors;

// The redirect target is looked up server-side from the campaign record, never taken from the URL
// itself, so this link can't be tampered with into an open redirect.
function trackClickUrl(campaignId: string, subscriptionId: string): string {
  return siteUrl(`/api/newsletter/track/click?c=${campaignId}&s=${subscriptionId}`);
}

interface Section {
  label: string;
  body: string;
}

function sections(campaign: NewsletterCampaign): Section[] {
  return [
    { label: "1. Regulatory Radar", body: campaign.radarHighlight },
    { label: "2. Reporting Insight", body: campaign.knowledgeHighlight },
    { label: "3. Daily Challenge", body: campaign.challengeHighlight },
    { label: "4. Community", body: campaign.communityHighlight },
    { label: "5. Coming Up", body: campaign.milestoneHighlight },
  ].filter((s) => s.body.trim() !== "");
}

export function renderNewsletterCampaignEmail(
  campaign: NewsletterCampaign,
  opts: { campaignId: string; subscriptionId: string },
): { subject: string; text: string; html: string } {
  const ctaUrl = trackClickUrl(opts.campaignId, opts.subscriptionId);
  const unsubscribeUrl = siteUrl(`/api/newsletter/unsubscribe?s=${opts.subscriptionId}&t=${unsubscribeTokenFor(opts.subscriptionId)}`);
  const pixelUrl = siteUrl(`/api/newsletter/track/open?c=${opts.campaignId}&s=${opts.subscriptionId}`);
  const sectionList = sections(campaign);

  const text = [
    "REGREPORTING WEEKLY",
    campaign.title,
    "",
    campaign.introText,
    "",
    ...sectionList.flatMap((s) => [s.label, s.body, ""]),
    buttonText({ label: campaign.ctaLabel, url: ctaUrl }),
    "",
    "—",
    "RegReporting Network",
    "The community and intelligence layer for regulatory reporting professionals.",
    "",
    `Unsubscribe from this newsletter: ${unsubscribeUrl}`,
  ].join("\n");

  const sectionRows = sectionList
    .map(
      (s) => `
<tr><td style="padding:14px 0;border-top:1px solid ${LINE};">
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${INK};">${escapeHtml(s.label)}</p>
<p style="margin:0;font-size:13px;color:${BODY};line-height:1.55;">${escapeHtml(s.body)}</p>
</td></tr>`,
    )
    .join("");

  const bodyHtml = `
<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">RegReporting Weekly</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">${escapeHtml(campaign.title)}</h1>
${campaign.introText ? `<p style="margin:0 0 20px;font-size:14px;color:${BODY};line-height:1.6;">${escapeHtml(campaign.introText)}</p>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionRows}</table>
<div style="margin-top:24px;">${button({ label: campaign.ctaLabel, url: ctaUrl })}</div>
<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;" />`;

  const footerExtraHtml = `<p style="margin:12px 0 0;font-size:12px;"><a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Unsubscribe from this newsletter</a></p>`;

  return { subject: campaign.subject, text, html: renderEmailLayout({ preview: campaign.previewText, bodyHtml, footerExtraHtml }) };
}
