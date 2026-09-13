import type { ContentStatus, SourceTier, SourceType } from "@/types";
import { DEMO_SECTIONS_ENABLED } from "@/lib/features";

export const ORGANISATION_TYPES = [
  "Sell-side bank",
  "Buy-side firm",
  "Trade repository",
  "Consultancy",
  "Technology vendor",
  "Regulator",
  "Corporate",
  "Other",
] as const;

export const SITE_NAME = "RegReporting Network";
export const SITE_TAGLINE = "The community and intelligence layer for regulatory reporting professionals.";

const DEMO_SECTION_HREFS = new Set(["/knowledge", "/regbot", "/challenges", "/timeline"]);
const visibleNav = <T extends { href: string }>(items: readonly T[]) => (DEMO_SECTIONS_ENABLED ? items : items.filter((item) => !DEMO_SECTION_HREFS.has(item.href)));

export const PRIMARY_NAV = visibleNav([
  { href: "/", label: "Home" },
  { href: "/radar", label: "Regulatory Radar" },
  { href: "/community", label: "Community" },
  { href: "/knowledge", label: "Knowledge Base" },
  { href: "/regbot", label: "RegBot" },
  { href: "/challenges", label: "Challenges" },
] as const);

export const SECONDARY_NAV = visibleNav([
  { href: "/timeline", label: "Timeline" },
  { href: "/admin", label: "Admin" },
] as const);

interface SourceTypeMeta {
  label: string;
  shortLabel: string;
  description: string;
  className: string;
  dotClassName: string;
  borderClassName: string;
}

/** Visual + textual treatment for each authority level. Class names live here so Tailwind compiles them. */
export const SOURCE_TYPE_META: Record<SourceType, SourceTypeMeta> = {
  "regulatory-requirement": {
    label: "Regulatory Requirement",
    shortLabel: "Requirement",
    description: "Published by a regulator or standard setter.",
    className: "bg-st-req-soft text-st-req border-st-req/20",
    dotClassName: "bg-st-req",
    borderClassName: "border-st-req",
  },
  "industry-guidance": {
    label: "Industry Guidance",
    shortLabel: "Guidance",
    description: "Non-binding guidance from an industry body or international standard setter.",
    className: "bg-st-guide-soft text-st-guide border-st-guide/20",
    dotClassName: "bg-st-guide",
    borderClassName: "border-st-guide",
  },
  "implementation-reference": {
    label: "Implementation Reference",
    shortLabel: "Implementation",
    description: "Technical specification from market infrastructure or a service provider.",
    className: "bg-st-impl-soft text-st-impl border-st-impl/20",
    dotClassName: "bg-st-impl",
    borderClassName: "border-st-impl",
  },
  "community-interpretation": {
    label: "Community Interpretation",
    shortLabel: "Community",
    description: "Member opinion. Not regulatory fact.",
    className: "bg-st-comm-soft text-st-comm border-st-comm/20",
    dotClassName: "bg-st-comm",
    borderClassName: "border-st-comm",
  },
};

export const SOURCE_TYPE_ORDER: SourceType[] = [
  "regulatory-requirement",
  "industry-guidance",
  "implementation-reference",
  "community-interpretation",
];

export const TIER_LABEL: Record<SourceTier, string> = {
  1: "Tier 1 · Regulator / standard setter",
  2: "Tier 2 · Industry body / infrastructure",
  3: "Tier 3 · Other industry source",
  4: "Tier 4 · Community",
};

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  "pending-review": "Pending review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};
