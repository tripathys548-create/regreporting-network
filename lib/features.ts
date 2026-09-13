/**
 * Knowledge Base, Challenges, Timeline and RegBot still run on sample content, so
 * they stay hidden (navigation, homepage, search, links and routes) until real
 * content ships. Set NEXT_PUBLIC_SHOW_DEMO_SECTIONS="true" at build time to show them.
 */
export const DEMO_SECTIONS_ENABLED = process.env.NEXT_PUBLIC_SHOW_DEMO_SECTIONS === "true";
