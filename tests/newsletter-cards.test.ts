import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOfficialSourceUrl, parseNewsletterCards, validateNewsletterCards } from "../lib/newsletter/cards";
import { renderNewsletterCampaignEmail } from "../lib/email/templates/newsletterCampaign";
import type { NewsletterCampaign, NewsletterCard } from "../types";

const card: NewsletterCard = {
  regulator: "ESMA",
  jurisdiction: "EU",
  date: "2026-09-22",
  title: "ESMA publishes Q&A on EMIR Refit <UTI> generation",
  whatChanged: "New Q&A clarifies who generates the UTI for cleared trades.",
  whyItMatters: "Mismatched UTI ownership is a top pairing-break cause.",
  action: "Check your UTI waterfall against the Q&A.",
  severity: "high",
  sourceUrl: "https://www.esma.europa.eu/press-news/esma-news/example",
};

describe("newsletter cards", () => {
  it("accepts official domains and subdomains, rejects others and http", () => {
    assert.equal(isOfficialSourceUrl("https://www.cftc.gov/PressRoom/1"), true);
    assert.equal(isOfficialSourceUrl("https://eur-lex.europa.eu/eli/reg/2024/2987"), true);
    assert.equal(isOfficialSourceUrl("http://www.cftc.gov/x"), false);
    assert.equal(isOfficialSourceUrl("https://cftc.gov.evil.com/x"), false);
    assert.equal(isOfficialSourceUrl("https://medium.com/some-blog"), false);
  });

  it("reports every problem for bad agent input", () => {
    const result = validateNewsletterCards([{ ...card, date: "22/09/2026", sourceUrl: "https://blog.example.com", title: "" }]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.errors.length, 3);
    assert.equal(validateNewsletterCards([]).ok, false);
    assert.equal(validateNewsletterCards([card]).ok, true);
  });

  it("drops malformed stored cards instead of throwing", () => {
    assert.deepEqual(parseNewsletterCards("nope"), []);
    assert.equal(parseNewsletterCards([card, { title: "x" }, null]).length, 1);
    assert.equal(parseNewsletterCards([{ ...card, severity: "urgent" }])[0].severity, "standard");
  });

  it("renders flashcards escaped, in html and text", () => {
    const campaign = { title: "Week 39", subject: "S", previewText: "", introText: "Intro", radarHighlight: "", knowledgeHighlight: "", challengeHighlight: "", communityHighlight: "", milestoneHighlight: "", ctaLabel: "Go", ctaUrl: "/", cards: [card], audience: "members", status: "draft", scheduledAt: null, sentAt: null, sentCount: 0, createdAt: "", id: "c1" } as NewsletterCampaign;
    process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret";
    const { html, text } = renderNewsletterCampaignEmail(campaign, { campaignId: "c1", subscriptionId: "s1" });
    assert.match(html, /&lt;UTI&gt;/);
    assert.match(html, /High impact/);
    assert.match(html, /Read the official source/);
    assert.match(text, /What changed: New Q&A/);
    assert.match(text, /Source: https:\/\/www\.esma\.europa\.eu/);
  });
});
