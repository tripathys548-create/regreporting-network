import type { RegulatorySource } from "@/types";

/**
 * Trusted-source registry. Tier drives RegBot ranking:
 * 1 regulators / standard setters, 2 core industry bodies & infrastructure,
 * 3 other industry sources, 4 community (not listed here — community is not a "source").
 */
export const SOURCES: RegulatorySource[] = [
  { id: "src-esma", slug: "esma", shortName: "ESMA", fullName: "European Securities and Markets Authority", tier: 1, sourceType: "regulatory-requirement", jurisdiction: "EU", websiteUrl: "https://www.esma.europa.eu", verifiedDomain: true },
  { id: "src-fca", slug: "fca", shortName: "FCA", fullName: "Financial Conduct Authority", tier: 1, sourceType: "regulatory-requirement", jurisdiction: "UK", websiteUrl: "https://www.fca.org.uk", verifiedDomain: true },
  { id: "src-cftc", slug: "cftc", shortName: "CFTC", fullName: "Commodity Futures Trading Commission", tier: 1, sourceType: "regulatory-requirement", jurisdiction: "US", websiteUrl: "https://www.cftc.gov", verifiedDomain: true },
  { id: "src-sec", slug: "sec", shortName: "SEC", fullName: "U.S. Securities and Exchange Commission", tier: 1, sourceType: "regulatory-requirement", jurisdiction: "US", websiteUrl: "https://www.sec.gov", verifiedDomain: true },
  { id: "src-bis", slug: "bis", shortName: "BIS", fullName: "Bank for International Settlements (CPMI-IOSCO)", tier: 1, sourceType: "industry-guidance", jurisdiction: "Global", websiteUrl: "https://www.bis.org", verifiedDomain: true },
  { id: "src-isda", slug: "isda", shortName: "ISDA", fullName: "International Swaps and Derivatives Association", tier: 2, sourceType: "industry-guidance", jurisdiction: "Global", websiteUrl: "https://www.isda.org", verifiedDomain: true },
  { id: "src-dtcc", slug: "dtcc", shortName: "DTCC", fullName: "Depository Trust & Clearing Corporation", tier: 2, sourceType: "implementation-reference", jurisdiction: "Global", websiteUrl: "https://www.dtcc.com", verifiedDomain: true },
  { id: "src-gleif", slug: "gleif", shortName: "GLEIF", fullName: "Global Legal Entity Identifier Foundation", tier: 3, sourceType: "implementation-reference", jurisdiction: "Global", websiteUrl: "https://www.gleif.org", verifiedDomain: true },
  { id: "src-anna-dsb", slug: "anna-dsb", shortName: "ANNA DSB", fullName: "Association of National Numbering Agencies Derivatives Service Bureau", tier: 3, sourceType: "implementation-reference", jurisdiction: "Global", websiteUrl: "https://www.anna-dsb.com", verifiedDomain: true },
];

/** Sources featured on the Regulatory Radar, in display order. */
export const RADAR_SOURCE_IDS = ["src-esma", "src-fca", "src-isda", "src-dtcc", "src-cftc", "src-bis"];
