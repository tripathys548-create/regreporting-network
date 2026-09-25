import { SOURCES } from "@/data/sources";
import type { NewsletterCard } from "@/types";

/** Official domains a newsletter card may cite, beyond the trusted-source registry. Subdomains are allowed. */
const EXTRA_OFFICIAL_DOMAINS = [
  "europa.eu", // EBA, ECB, EUR-Lex, European Commission
  "bankofengland.co.uk",
  "legislation.gov.uk",
  "mas.gov.sg",
  "asic.gov.au",
  "fsa.go.jp",
  "hkma.gov.hk",
  "sfc.hk",
  "osc.ca",
  "federalregister.gov",
  "iosco.org",
  "fsb.org",
  "lseg.com",
  "regis-tr.com",
];

export const NEWSLETTER_SOURCE_DOMAINS: string[] = [
  ...SOURCES.map((s) => new URL(s.websiteUrl).hostname.toLowerCase().replace(/^www\./, "")),
  ...EXTRA_OFFICIAL_DOMAINS,
];

export const MAX_NEWSLETTER_CARDS = 10;

export function isOfficialSourceUrl(link: string): boolean {
  try {
    const url = new URL(link);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && NEWSLETTER_SOURCE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

const SEVERITIES = new Set(["critical", "high", "standard"]);
const SEVERITY_RANK: Record<NewsletterCard["severity"], number> = { critical: 0, high: 1, standard: 2 };

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Lenient read of stored JSON (never throws); malformed entries are dropped. Used when rendering. */
export function parseNewsletterCards(raw: unknown): NewsletterCard[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): NewsletterCard | null => {
      if (!item || typeof item !== "object") return null;
      const r = item as Record<string, unknown>;
      const card: NewsletterCard = {
        regulator: str(r.regulator, 40),
        jurisdiction: str(r.jurisdiction, 40),
        date: str(r.date, 10),
        title: str(r.title, 200),
        whatChanged: str(r.whatChanged, 600),
        whyItMatters: str(r.whyItMatters, 600),
        action: str(r.action, 400),
        severity: SEVERITIES.has(r.severity as string) ? (r.severity as NewsletterCard["severity"]) : "standard",
        sourceUrl: str(r.sourceUrl, 500),
      };
      return card.title && card.whatChanged && isOfficialSourceUrl(card.sourceUrl) ? card : null;
    })
    .filter((c): c is NewsletterCard => c !== null)
    // Most urgent first; Array.prototype.sort is stable, so the author's order holds within a severity.
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, MAX_NEWSLETTER_CARDS);
}

/** Strict validation for agent input: returns every problem so the agent can fix and retry. */
export function validateNewsletterCards(raw: unknown): { ok: true; cards: NewsletterCard[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, errors: ["cards must be a non-empty array."] };
  if (raw.length > MAX_NEWSLETTER_CARDS) return { ok: false, errors: [`At most ${MAX_NEWSLETTER_CARDS} cards.`] };

  const errors: string[] = [];
  raw.forEach((item, i) => {
    const r = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    for (const key of ["regulator", "jurisdiction", "date", "title", "whatChanged", "whyItMatters", "sourceUrl"]) {
      if (!str(r[key], 1000)) errors.push(`cards[${i}].${key} is required.`);
    }
    if (r.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))) errors.push(`cards[${i}].date must be YYYY-MM-DD.`);
    if (r.severity !== undefined && !SEVERITIES.has(r.severity as string)) errors.push(`cards[${i}].severity must be critical, high or standard.`);
    if (r.sourceUrl && !isOfficialSourceUrl(String(r.sourceUrl))) errors.push(`cards[${i}].sourceUrl must be an https link on an official regulator/industry domain.`);
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, cards: parseNewsletterCards(raw) };
}
