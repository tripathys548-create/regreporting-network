import { unsubscribeTokenFor } from "@/lib/newsletter/tokens";
import { siteUrl } from "@/lib/site";
import type { NewsletterCampaign, NewsletterCard } from "@/types";
import { button, buttonText, emailColors, escapeHtml, renderEmailLayout } from "./layout";

const { NAVY, ACCENT, INK, BODY, MUTED, LINE, CANVAS } = emailColors;

const SEVERITY_STYLE: Record<NewsletterCard["severity"], { bar: string; label: string }> = {
  critical: { bar: "#B42318", label: "Action required" },
  high: { bar: "#B54708", label: "High impact" },
  standard: { bar: ACCENT, label: "For awareness" },
};

function cardText(card: NewsletterCard, index: number): string {
  return [
    `${index + 1}. ${card.title}`,
    `   ${card.regulator} · ${card.jurisdiction} · ${card.date} · ${SEVERITY_STYLE[card.severity].label}`,
    `   What changed: ${card.whatChanged}`,
    `   Why it matters: ${card.whyItMatters}`,
    ...(card.action ? [`   Action: ${card.action}`] : []),
    `   Source: ${card.sourceUrl}`,
    "",
  ].join("\n");
}

// Table-based so the flashcard survives Outlook/Gmail; the coloured left bar carries the severity.
function cardHtml(card: NewsletterCard): string {
  const style = SEVERITY_STYLE[card.severity];
  const row = (label: string, body: string) =>
    body
      ? `<p style="margin:10px 0 0;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};">${label}</p>
<p style="margin:2px 0 0;font-size:13px;color:${BODY};line-height:1.55;">${escapeHtml(body)}</p>`
      : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;border:1px solid ${LINE};border-radius:8px;border-collapse:separate;background:#ffffff;">
<tr>
<td width="5" style="width:5px;background:${style.bar};border-radius:8px 0 0 8px;font-size:0;line-height:0;">&nbsp;</td>
<td style="padding:14px 16px 16px;">
<p style="margin:0;font-size:11px;line-height:1.4;">
<span style="display:inline-block;background:${NAVY};color:#ffffff;font-weight:700;letter-spacing:0.04em;padding:2px 7px;border-radius:4px;">${escapeHtml(card.regulator)}</span>
<span style="color:${MUTED};">&nbsp;${escapeHtml(card.jurisdiction)} · ${escapeHtml(card.date)}</span>
<span style="color:${style.bar};font-weight:700;">&nbsp;· ${style.label}</span>
</p>
<p style="margin:8px 0 0;font-size:15px;font-weight:700;color:${INK};line-height:1.35;">${escapeHtml(card.title)}</p>
${row("What changed", card.whatChanged)}
${row("Why it matters", card.whyItMatters)}
${row("What to do", card.action)}
<p style="margin:12px 0 0;font-size:12px;"><a href="${escapeHtml(card.sourceUrl)}" style="color:${ACCENT};font-weight:600;text-decoration:none;" target="_blank" rel="noopener noreferrer">Read the official source &rarr;</a></p>
</td>
</tr>
</table>`;
}

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

// For the weekly digest (campaigns with cards) the highlight fields become "Get more from RegWorld"
// prompts, each pointing at the part of the site it promotes.
function engagement(campaign: NewsletterCampaign): (Section & { url: string; cta: string })[] {
  return [
    { label: "Regulatory Radar", body: campaign.radarHighlight, url: siteUrl("/radar"), cta: "Track every update" },
    { label: "Ask RegBot", body: campaign.knowledgeHighlight, url: siteUrl("/regbot"), cta: "Ask RegBot" },
    { label: "Daily Challenge", body: campaign.challengeHighlight, url: siteUrl("/challenges"), cta: "Take today's challenge" },
    { label: "Community", body: campaign.communityHighlight, url: siteUrl("/community"), cta: "Join the discussion" },
    { label: "Knowledge Base", body: campaign.milestoneHighlight, url: siteUrl("/knowledge"), cta: "Open the Knowledge Base" },
  ].filter((s) => s.body.trim() !== "");
}

function engagementHtml(items: ReturnType<typeof engagement>): string {
  if (!items.length) return "";
  const rows = items
    .map(
      (s) => `
<tr><td style="padding:12px 0;border-top:1px solid ${LINE};">
<p style="margin:0 0 3px;font-size:13px;font-weight:700;color:${INK};">${escapeHtml(s.label)}</p>
<p style="margin:0 0 6px;font-size:13px;color:${BODY};line-height:1.55;">${escapeHtml(s.body)}</p>
<a href="${s.url}" style="font-size:12px;font-weight:600;color:${ACCENT};text-decoration:none;" target="_blank" rel="noopener noreferrer">${escapeHtml(s.cta)} &rarr;</a>
</td></tr>`,
    )
    .join("");
  return `
<p style="margin:24px 0 2px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">Get more from RegWorld</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

export function renderNewsletterCampaignEmail(
  campaign: NewsletterCampaign,
  opts: { campaignId: string; subscriptionId: string },
): { subject: string; text: string; html: string } {
  const ctaUrl = trackClickUrl(opts.campaignId, opts.subscriptionId);
  const unsubscribeUrl = siteUrl(`/api/newsletter/unsubscribe?s=${opts.subscriptionId}&t=${unsubscribeTokenFor(opts.subscriptionId)}`);
  const pixelUrl = siteUrl(`/api/newsletter/track/open?c=${opts.campaignId}&s=${opts.subscriptionId}`);
  const cards = campaign.cards ?? [];
  const engagementList = cards.length ? engagement(campaign) : [];
  const sectionList = cards.length ? [] : sections(campaign);

  const text = [
    "REGREPORTING WEEKLY",
    campaign.title,
    "",
    campaign.introText,
    "",
    ...(cards.length ? ["THIS WEEK IN REGULATORY REPORTING", "", ...cards.map(cardText)] : []),
    ...(engagementList.length ? ["GET MORE FROM REGWORLD", "", ...engagementList.flatMap((s) => [s.label, s.body, `${s.cta}: ${s.url}`, ""])] : []),
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
${cards.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};border-radius:8px;"><tr><td style="padding:14px 12px 0;">${cards.map(cardHtml).join("")}</td></tr></table>` : ""}
${engagementHtml(engagementList)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionRows}</table>
<div style="margin-top:24px;">${button({ label: campaign.ctaLabel, url: ctaUrl })}</div>
<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;border:0;" />`;

  const footerExtraHtml = `<p style="margin:12px 0 0;font-size:12px;"><a href="${unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Unsubscribe from this newsletter</a></p>`;

  return { subject: campaign.subject, text, html: renderEmailLayout({ preview: campaign.previewText, bodyHtml, footerExtraHtml }) };
}
