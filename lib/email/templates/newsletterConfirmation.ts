import { siteUrl } from "@/lib/site";
import { button, buttonText, emailColors, renderEmailLayout } from "./layout";

const { INK, BODY, MUTED } = emailColors;

export function renderNewsletterConfirmationEmail(confirmToken: string): { subject: string; text: string; html: string } {
  const subject = "Confirm your RegReporting Network subscription";
  const confirmUrl = siteUrl(`/newsletter/confirm?token=${confirmToken}`);

  const text = [
    "Confirm your RegReporting Network subscription",
    "",
    "Thanks for subscribing to the RegReporting Network newsletter.",
    "You'll receive selected regulatory developments, reporting insights, important milestones and useful resources.",
    "",
    buttonText({ label: "Confirm subscription", url: confirmUrl }),
    "",
    "If you did not request this, no action is required — you will not receive any further emails unless you confirm.",
  ].join("\n");

  const bodyHtml = `
<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">Confirm subscription</p>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:${INK};">Confirm your RegReporting Network subscription</h1>
<p style="margin:0 0 12px;font-size:14px;color:${BODY};line-height:1.6;">Thanks for subscribing to the RegReporting Network newsletter.</p>
<p style="margin:0 0 24px;font-size:14px;color:${BODY};line-height:1.6;">You'll receive selected regulatory developments, reporting insights, important milestones and useful resources.</p>
${button({ label: "Confirm subscription", url: confirmUrl })}
<p style="margin:24px 0 0;font-size:12px;color:${MUTED};line-height:1.6;">If you did not request this, no action is required — you will not receive any further emails unless you confirm.</p>`;

  return { subject, text, html: renderEmailLayout({ preview: "Confirm your subscription to the RegReporting Network newsletter.", bodyHtml }) };
}
