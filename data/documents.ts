import type { SourceDocument } from "@/types";

/**
 * Source document registry used by Knowledge Base citations and RegBot.
 * Titles reference well-known publications, but every entry is flagged isDemo
 * until the citation engine verifies titles, dates and deep links against the
 * official publisher. Dates are indicative.
 */
export const DOCUMENTS: SourceDocument[] = [
  { id: "doc-emir-reg", sourceId: "src-esma", title: "Regulation (EU) No 648/2012 (EMIR)", documentType: "regulation", sourceType: "regulatory-requirement", publishedAt: "2012-07-27", url: "https://eur-lex.europa.eu/eli/reg/2012/648/oj", isDemo: true },
  { id: "doc-emir-rts", sourceId: "src-esma", title: "RTS on the details of reports to trade repositories (EMIR REFIT)", documentType: "technical-standard", sourceType: "regulatory-requirement", publishedAt: "2022-10-07", url: "https://www.esma.europa.eu", isDemo: true },
  { id: "doc-emir-guidelines", sourceId: "src-esma", title: "Guidelines for reporting under EMIR", documentType: "guidelines", sourceType: "regulatory-requirement", publishedAt: "2023-12-14", url: "https://www.esma.europa.eu", isDemo: true },
  { id: "doc-emir-validation", sourceId: "src-esma", title: "EMIR REFIT validation rules and reconciliation tolerances", documentType: "validation-rules", sourceType: "regulatory-requirement", publishedAt: "2026-09-11", url: "https://www.esma.europa.eu", isDemo: true },
  { id: "doc-emir-qa", sourceId: "src-esma", title: "Questions and Answers on EMIR data reporting", documentType: "q-and-a", sourceType: "regulatory-requirement", publishedAt: "2026-08-21", url: "https://www.esma.europa.eu", isDemo: true },
  { id: "doc-fca-ukemir", sourceId: "src-fca", title: "UK EMIR reporting — policy statement and technical guidance", documentType: "guidelines", sourceType: "regulatory-requirement", publishedAt: "2024-02-27", url: "https://www.fca.org.uk", isDemo: true },
  { id: "doc-sftr-reg", sourceId: "src-esma", title: "Regulation (EU) 2015/2365 (SFTR)", documentType: "regulation", sourceType: "regulatory-requirement", publishedAt: "2015-12-23", url: "https://eur-lex.europa.eu/eli/reg/2015/2365/oj", isDemo: true },
  { id: "doc-cftc-part45", sourceId: "src-cftc", title: "17 CFR Part 45 — Swap Data Recordkeeping and Reporting Requirements", documentType: "regulation", sourceType: "regulatory-requirement", publishedAt: "2020-11-25", url: "https://www.ecfr.gov/current/title-17/chapter-I/part-45", isDemo: true },
  { id: "doc-sec-sbsr", sourceId: "src-sec", title: "Regulation SBSR — Reporting and Dissemination of Security-Based Swap Information", documentType: "regulation", sourceType: "regulatory-requirement", publishedAt: "2016-07-14", url: "https://www.sec.gov", isDemo: true },
  { id: "doc-cpmi-uti", sourceId: "src-bis", title: "CPMI-IOSCO Technical Guidance: Harmonisation of the Unique Transaction Identifier", documentType: "industry-guidance", sourceType: "industry-guidance", publishedAt: "2017-02-28", url: "https://www.bis.org", isDemo: true },
  { id: "doc-cpmi-upi", sourceId: "src-bis", title: "CPMI-IOSCO Technical Guidance: Harmonisation of the Unique Product Identifier", documentType: "industry-guidance", sourceType: "industry-guidance", publishedAt: "2017-09-28", url: "https://www.bis.org", isDemo: true },
  { id: "doc-cpmi-cde", sourceId: "src-bis", title: "CPMI-IOSCO Technical Guidance: Harmonisation of Critical OTC Derivatives Data Elements", documentType: "industry-guidance", sourceType: "industry-guidance", publishedAt: "2023-09-29", url: "https://www.bis.org", isDemo: true },
  { id: "doc-isda-drr", sourceId: "src-isda", title: "ISDA Digital Regulatory Reporting — programme overview", documentType: "industry-guidance", sourceType: "industry-guidance", publishedAt: "2026-09-05", url: "https://www.isda.org", isDemo: true },
  { id: "doc-isda-uti-bp", sourceId: "src-isda", title: "ISDA best practice note on UTI generation and sharing", documentType: "industry-guidance", sourceType: "industry-guidance", publishedAt: "2024-03-12", url: "https://www.isda.org", isDemo: true },
  { id: "doc-dtcc-gtr-spec", sourceId: "src-dtcc", title: "DTCC GTR message specification (EMIR)", documentType: "technical-specification", sourceType: "implementation-reference", publishedAt: "2026-09-03", url: "https://www.dtcc.com", isDemo: true },
  { id: "doc-gleif-lei", sourceId: "src-gleif", title: "LEI data and renewal status — GLEIF documentation", documentType: "technical-specification", sourceType: "implementation-reference", publishedAt: "2025-06-01", url: "https://www.gleif.org", isDemo: true },
  { id: "doc-dsb-upi", sourceId: "src-anna-dsb", title: "UPI Service — product definitions and templates", documentType: "technical-specification", sourceType: "implementation-reference", publishedAt: "2025-04-15", url: "https://www.anna-dsb.com", isDemo: true },
];
