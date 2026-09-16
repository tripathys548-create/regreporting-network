# Roadmap

This tracks what the "RegWorld Master Product Upgrade" spec asked for beyond
the P0 pass (homepage consolidation, presence, notifications v2, sharing,
admin-suggestion polish, security-pattern extension) implemented in
2026-09. The spec itself mandates phased delivery (§62) — this file is that
phasing, kept honest against what's actually shipped.

## P1 — next

- **Open Graph images.** Dynamic `opengraph-image.tsx` routes for
  discussions, regulatory updates, and knowledge articles so shared links
  render rich previews (title, summary, RegWorld branding). See
  `docs/SHARING.md`.
- **Knowledge Base → database.** `data/knowledge.ts` is still static. Moving
  it to a `KnowledgeArticle` Prisma model unlocks an admin authoring UI and
  the `NEW_KNOWLEDGE_ARTICLE` notification trigger (currently deferred —
  see `docs/NOTIFICATIONS.md`).
- **Personalized feed beyond topic-follow.** Topic following
  (`UserFollow targetType="topic"`) and its notification already exist; a
  dedicated "For you" homepage feed that actively re-ranks content by
  followed topics is not built yet.
- **Security dashboard enhancements.** Per-alert investigation workflow,
  richer event filtering/search on `/admin?section=security`.
- **Cloudflare-side rate limiting mirrors.** `docs/CLOUDFLARE_SETUP.md`
  documents the setup; verifying the edge rules actually match
  `lib/security/config.ts`'s limits is an operational task, not a code one.
- **Redis-backed rate limiting / online-count cache.** `lib/rateLimit.ts`
  and the presence cache (`lib/repositories/presence.ts`) are in-memory,
  single-process. Fine for one Node instance; needs a shared store before
  running more than one.

## P2 — later

- Advanced RegBot retrieval/RAG (current RegBot is reference-library or
  direct-LLM; no server-side document retrieval yet, though the SSRF
  allowlist for it already exists — `lib/security/ssrf.ts`).
- Community consensus / crowd-sourced answer quality signals.
- Enterprise functionality (SSO, org-level accounts, etc.) — not scoped by
  the spec in detail; would need its own requirements pass.

## Known duplicate, intentionally untouched this pass

`Challenges` has two independent, both-live implementations: a
localStorage-driven "Daily Reg Challenge" (`hooks/useDailyChallenge.ts` +
`data/dailyQuestionBank/`) and a DB-repository-shaped `Challenge` entity
system (`data/challenges.ts` + `lib/repositories/challenges.ts` +
`/challenges/[slug]`). They share no code, types, or state. Consolidating
them was explicitly deferred by the user for this pass — it's a real
product decision (which UX wins, what happens to existing localStorage
streaks) that shouldn't be folded into an unrelated upgrade. Flagging here
so it isn't lost.
