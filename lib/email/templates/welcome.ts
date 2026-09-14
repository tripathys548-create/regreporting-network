import { siteUrl } from "@/lib/site";
import { button, buttonText, DISCLAIMER, emailColors, escapeHtml, renderEmailLayout } from "./layout";

const { INK, BODY, MUTED, LINE } = emailColors;

interface WelcomeEmailInput {
  firstName: string | null;
}

function firstNameOrGreeting(firstName: string | null): string {
  return firstName ? `Hi ${firstName},` : "Hi there,";
}

const FEATURES = [
  { title: "1. Regulatory Radar", body: "Stay on top of important regulatory developments and official-source updates.", label: "Explore Regulatory Radar", path: "/radar" },
  { title: "2. Daily Reg Challenge", body: "Test yourself every day with 5 questions covering EMIR, CFTC, MAS + 2 rotating regulatory topics.", label: "Take today's challenge", path: "/challenges#daily" },
  { title: "3. Knowledge Base", body: "Quickly review topics such as EMIR, UK EMIR, SFTR, CFTC, UTI, UPI, LEI, and Trade Repository / Data Quality.", label: "Explore Knowledge Base", path: "/knowledge" },
  { title: "4. RegBot", body: "Ask quick regulatory-reporting questions and use RegBot to understand concepts and reporting scenarios.", label: "Ask RegBot", path: "/?regbot=1" },
  { title: "5. Community", body: "Ask questions, share implementation experiences, vote and learn from other practitioners.", label: "Join the discussion", path: "/community" },
  { title: "6. Upcoming Milestones", body: "Keep track of important regulatory dates and implementation milestones.", label: "View timeline", path: "/timeline" },
];

export function renderWelcomeEmail({ firstName }: WelcomeEmailInput): { subject: string; text: string; html: string } {
  const subject = "Welcome to RegReporting Network";
  const greeting = firstNameOrGreeting(firstName);
  const challengeUrl = siteUrl("/challenges#daily");

  const text = [
    greeting,
    "",
    "Thanks for joining the network. This site brings together regulatory updates, reporting knowledge, practitioner discussions and daily challenges across major reporting regimes.",
    "",
    "WHAT YOU CAN DO",
    ...FEATURES.map((f) => `\n${f.title}\n${f.body}\n${buttonText({ label: f.label, url: siteUrl(f.path) })}`),
    "",
    "ONE SUGGESTION",
    "Start with today's Daily Reg Challenge. It takes around 2 minutes and gives you a quick way to build your regulatory knowledge.",
    buttonText({ label: "Start today's challenge", url: challengeUrl }),
    "",
    "🔥 TODAY'S DAILY REG CHALLENGE",
    "5 Questions · EMIR · CFTC · MAS + 2 rotating topics · 90–120 seconds",
    buttonText({ label: "Take today's challenge", url: challengeUrl }),
    "",
    "—",
    "RegReporting Network",
    "The community and intelligence layer for regulatory reporting professionals.",
    DISCLAIMER,
  ].join("\n");

  const featureRows = FEATURES.map(
    (f) => `
<tr><td style="padding:16px 0;border-top:1px solid ${LINE};">
<p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${INK};">${escapeHtml(f.title)}</p>
<p style="margin:0 0 10px;font-size:13px;color:${BODY};line-height:1.5;">${escapeHtml(f.body)}</p>
${button({ label: f.label, url: siteUrl(f.path) })}
</td></tr>`,
  ).join("");

  const bodyHtml = `
<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">Welcome</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${INK};">Welcome to RegReporting Network</h1>
<p style="margin:0 0 8px;font-size:14px;color:${BODY};line-height:1.6;">${escapeHtml(greeting)}</p>
<p style="margin:0 0 20px;font-size:14px;color:${BODY};line-height:1.6;">Thanks for joining the network. This site brings together regulatory updates, reporting knowledge, practitioner discussions and daily challenges across major reporting regimes.</p>

<div style="background:#FFF7ED;border:1px solid #FDE7C8;border-radius:6px;padding:16px;margin:0 0 24px;">
<p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${INK};">🔥 Today's Daily Reg Challenge</p>
<p style="margin:0 0 12px;font-size:12px;color:${BODY};">5 Questions · EMIR · CFTC · MAS + 2 rotating topics · 90–120 seconds</p>
${button({ label: "Take today's challenge", url: challengeUrl })}
</div>

<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">What you can do</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${featureRows}</table>

<div style="margin-top:24px;padding-top:20px;border-top:1px solid ${LINE};">
<p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${MUTED};text-transform:uppercase;">One suggestion</p>
<p style="margin:0 0 12px;font-size:14px;color:${BODY};line-height:1.6;">Start with today's Daily Reg Challenge. It takes around 2 minutes and gives you a quick way to build your regulatory knowledge.</p>
${button({ label: "Start today's challenge", url: challengeUrl })}
</div>`;

  return { subject, text, html: renderEmailLayout({ preview: "Your professional regulatory-reporting community is ready.", bodyHtml }) };
}
