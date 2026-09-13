import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMPARISONS, ENTRIES, VERSION_CAVEAT } from "../lib/regbot/library";
import { answerFromLibrary, findEntries, normaliseQuestion } from "../lib/regbot/libraryAnswer";
import { isTopicSlug } from "../data/topics";

describe("RegBot reference library content", () => {
  it("has unique ids and one-sentence definitions", () => {
    const ids = new Set<string>();
    for (const entry of ENTRIES) {
      assert.ok(!ids.has(entry.id), `duplicate id ${entry.id}`);
      ids.add(entry.id);
      assert.ok(!entry.definition.includes("\n"), `${entry.id} definition spans lines`);
      assert.match(entry.definition, /\.$/, `${entry.id} definition must end with a full stop`);
      assert.equal(entry.definition.split(/\.\s+[A-Z]/).length, 1, `${entry.id} definition must be a single sentence`);
      assert.ok(entry.topics.every(isTopicSlug), `${entry.id} has an unknown topic`);
      assert.ok(entry.terms.every((t) => normaliseQuestion(t).trim() === t), `${entry.id} has a non-normalised term`);
    }
  });

  it("only compares entries that exist, keyed in sorted order", () => {
    for (const key of Object.keys(COMPARISONS)) {
      const [a, b] = key.split("|");
      assert.ok(ENTRIES.some((e) => e.id === a) && ENTRIES.some((e) => e.id === b), `unknown comparison ${key}`);
      assert.equal(key, [a, b].sort().join("|"));
    }
  });
});

describe("RegBot reference answers", () => {
  it("answers 'What is X?' with the one-sentence definition", () => {
    const answer = answerFromLibrary("What is UTI?");
    assert.equal(answer?.kind, "definition");
    assert.equal(answer?.summary, "A UTI (Unique Transaction Identifier) is a globally unique identifier used to identify and match a reportable derivatives transaction across reporting parties and systems.");
    assert.deepEqual(answer?.classification.topics, ["uti"]);
  });

  it("prefers the longest term, so UK EMIR is not answered as EU EMIR", () => {
    assert.deepEqual(findEntries(normaliseQuestion("What is UK EMIR?")).map((e) => e.id), ["uk-emir"]);
    assert.equal(answerFromLibrary("Explain EMIR Refit")?.matched[0], "emir-refit");
  });

  it("never invents field counts", () => {
    for (const q of ["How many fields are reported under EMIR?", "How many fields in CFTC?", "how many mandatory fields in MAS", "How many data elements are reported?"]) {
      const answer = answerFromLibrary(q);
      assert.equal(answer?.kind, "field-count", q);
      assert.match(answer!.summary, /depends on the applicable reporting specification and version/, q);
      assert.doesNotMatch(answer!.summary.split("\n")[0], /\b\d{2,}\b/, q);
    }
    assert.match(answerFromLibrary("How many fields are reported in AML?")!.summary, /no single universal reporting-field count/);
  });

  it("answers comparisons with the prewritten table", () => {
    const answer = answerFromLibrary("CFTC vs EMIR");
    assert.equal(answer?.kind, "comparison");
    assert.match(answer!.summary, /^CFTC reporting applies to US-regulated swaps markets/);
    assert.match(answer!.summary, /\n- Authority:/);
    assert.equal(answerFromLibrary("difference between Part 43 and Part 45")?.matched.join(","), "part-43,part-45");
  });

  it("handles who-regulates, why-important and what-do-we-report questions", () => {
    assert.match(answerFromLibrary("Who regulates SFTR?")!.summary, /^SFTR is primarily regulated by ESMA/);
    assert.match(answerFromLibrary("Why is the LEI important?")!.summary, /^The LEI matters because/);
    assert.match(answerFromLibrary("What do we report under SFTR?")!.summary, /^Under SFTR/);
    assert.equal(answerFromLibrary("How does regulatory reporting work?")?.kind, "reporting-flow");
  });

  it("adds the version caveat for date-sensitive entries only", () => {
    assert.ok(answerFromLibrary("What is EMIR Refit?")!.summary.endsWith(VERSION_CAVEAT));
    assert.ok(!answerFromLibrary("What is ISDA?")!.summary.includes(VERSION_CAVEAT));
  });

  it("links citations only to verified official websites", () => {
    const answer = answerFromLibrary("What is CFTC Part 45?")!;
    assert.equal(answer.sources[0].url, "https://www.cftc.gov");
    assert.ok(answer.sources.every((s) => s.publishedAt === null && !s.isDemo));
  });

  it("flags scenario questions that only mention a term as weak matches", () => {
    assert.equal(answerFromLibrary("What happens when the UTI is missing on a lifecycle event?")?.weakMatch, true);
    assert.equal(answerFromLibrary("What is UTI?")?.weakMatch, false);
    assert.equal(answerFromLibrary("EMIR Refit")?.weakMatch, false);
    assert.equal(answerFromLibrary("Explain the LEI")?.weakMatch, false);
  });

  it("returns null when nothing in the library matches", () => {
    assert.equal(answerFromLibrary("What is the best pizza topping?"), null);
    assert.equal(answerFromLibrary(""), null);
  });
});
