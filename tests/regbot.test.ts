import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normaliseModelAnswer } from "../lib/regbot/normalise";
import { REGBOT_SYSTEM_PROMPT } from "../lib/regbot/systemPrompt";

describe("RegBot model answer normalisation", () => {
  it("maps a one-sentence definition to the answer contract", () => {
    const result = normaliseModelAnswer({
      answer: "A UTI (Unique Transaction Identifier) is a globally unique identifier used to identify and match a reportable derivatives transaction.",
      intent: "definition",
      topics: ["uti"],
      confidence: "high",
      confidence_rationale: "Well-established concept; no live source retrieval was used.",
    });
    assert.equal(result.classification.intent, "definition");
    assert.deepEqual(result.classification.topics, ["uti"]);
    assert.equal(result.confidence, "high");
    assert.equal(result.blocks.length, 0);
    assert.equal(result.sources.length, 0);
  });

  it("links only registered official domains and never model-supplied URLs", () => {
    const result = normaliseModelAnswer({
      answer: "CFTC Part 45 covers swap data reporting to SDRs.",
      intent: "requirement-lookup",
      topics: ["cftc"],
      sources: [
        { authority: "CFTC", title: "17 CFR Part 45", category: "regulatory-requirement", url: "https://evil.example" },
        { authority: "MAS", title: "Securities and Futures (Reporting of Derivatives Contracts) Regulations", category: "regulatory-requirement" },
        { authority: "Some Blog", title: "Unofficial summary", category: "community-interpretation" },
      ],
      confidence: "medium",
      confidence_rationale: "Model knowledge.",
    });
    assert.equal(result.sources[0].url, "https://www.cftc.gov");
    assert.equal(result.sources[0].tier, 1);
    assert.equal(result.sources[1].url, "https://www.mas.gov.sg");
    assert.equal(result.sources[2].url, null);
    assert.equal(result.sources[2].tier, 3);
    assert.ok(result.sources.every((s) => s.publishedAt === null && !s.isDemo));
  });

  it("drops invalid enums, topics and source indexes", () => {
    const result = normaliseModelAnswer({
      answer: "Answer.",
      intent: "made-up",
      topics: ["emir", "not-a-topic", "emir"],
      statements: [{ category: "law", text: "Statement.", source_indexes: [0, 7, -1, 1.5] }],
      sources: [{ authority: "ESMA", title: "EMIR RTS", category: "regulatory-requirement" }],
      confidence: "certain",
    });
    assert.equal(result.classification.intent, "requirement-lookup");
    assert.deepEqual(result.classification.topics, ["emir"]);
    assert.equal(result.blocks[0].sourceType, "industry-guidance");
    assert.deepEqual(result.blocks[0].sourceRefs, [0]);
    assert.equal(result.confidence, "low");
    assert.ok(result.confidenceRationale.length > 0);
  });

  it("forces low confidence out of scope and appends caveats", () => {
    const result = normaliseModelAnswer({ answer: "RegBot covers regulatory reporting topics.", intent: "out-of-scope", topics: [], confidence: "high", confidence_rationale: "n/a", caveat: "Requirements may vary by version." });
    assert.equal(result.confidence, "low");
    assert.match(result.summary, /\n\nRequirements may vary by version\.$/);
  });

  it("rejects an empty answer", () => {
    assert.throws(() => normaliseModelAnswer({ answer: "   " }), /empty answer/);
    assert.throws(() => normaliseModelAnswer(null), /empty answer/);
  });

  it("includes the full specification and runtime rules in the system prompt", () => {
    assert.match(REGBOT_SYSTEM_PROMPT, /^You are RegBot/);
    assert.match(REGBOT_SYSTEM_PROMPT, /30\. FINAL RESPONSE PRINCIPLE/);
    assert.match(REGBOT_SYSTEM_PROMPT, /Never fabricate field counts/);
    assert.match(REGBOT_SYSTEM_PROMPT, /regbot_answer tool exactly once/);
  });
});
