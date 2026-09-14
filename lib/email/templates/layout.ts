const NAVY = "#0B1A2E";
const ACCENT = "#1D5FAF";
const INK = "#101828";
const BODY = "#3B4453";
const MUTED = "#6B7280";
const LINE = "#E4E7EC";
const CANVAS = "#F6F7F9";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface EmailButton {
  label: string;
  url: string;
}

export function button({ label, url }: EmailButton): string {
  return `<a href="${url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:6px;" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

export function buttonText({ label, url }: EmailButton): string {
  return `[ ${label.toUpperCase()} ] ${url}`;
}

const DISCLAIMER = "Content on this platform is reference and training material and is not legal or regulatory advice. Always consult the official source.";

/**
 * Shared table-based HTML shell so every transactional/marketing email shares the same
 * clean, restrained branding. Mobile-responsive via a fluid 100%-width table with a max-width cap.
 */
export function renderEmailLayout(opts: { preview?: string; bodyHtml: string; footerExtraHtml?: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RegReporting Network</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${opts.preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preview)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CANVAS};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:8px;overflow:hidden;">
<tr><td style="background:${NAVY};padding:20px 28px;">
<span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;letter-spacing:0.12em;color:#ffffff;font-weight:600;">REGREPORTING NETWORK</span>
</td></tr>
<tr><td style="padding:32px 28px 8px;">
${opts.bodyHtml}
</td></tr>
<tr><td style="padding:24px 28px 28px;border-top:1px solid ${LINE};margin-top:16px;">
<p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${INK};">RegReporting Network</p>
<p style="margin:0 0 12px;font-size:12px;color:${MUTED};line-height:1.5;">The community and intelligence layer for regulatory reporting professionals.</p>
<p style="margin:0 0 12px;font-size:11px;color:${MUTED};line-height:1.5;">${DISCLAIMER}</p>
${opts.footerExtraHtml ?? ""}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export const emailColors = { NAVY, ACCENT, INK, BODY, MUTED, LINE, CANVAS };
export { DISCLAIMER };
