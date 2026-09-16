# RegReporting Network

The community and intelligence layer for regulatory reporting professionals — regulatory updates from official
sources, practitioner discussion, a cited knowledge base, a research assistant (RegBot) and professional
training challenges.

**Status: Phase 3 + P0 community upgrade.** PostgreSQL, real regulatory update ingestion from official feeds
with admin review, moderation tools, an audit log and SMTP email — plus online member presence, an expanded
notification system with per-member preferences, a reusable share button (WhatsApp/LinkedIn/X/email/native),
and a consolidated "This Week in Regulatory Reporting" homepage section. See `docs/PRESENCE.md`,
`docs/NOTIFICATIONS.md`, `docs/SHARING.md` and `docs/ROADMAP.md` for what's next. Knowledge articles,
challenge questions, milestones and RegBot answers are still **Example / Demo Content**. Nothing here is
legal or regulatory advice.

## Run it

```bash
brew install postgresql@16 && brew services start postgresql@16
createdb regreporting
npm install                 # also runs prisma generate
cp .env.example .env        # set DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), SMTP_PASS
npm run db:migrate          # applies prisma/migrations to PostgreSQL
npm run db:seed             # demo members & discussions; registers the official feeds
npm run ingest              # fetch official feeds into the review queue
npm run dev                 # http://localhost:3100
npm test                    # ingestion parser/classifier tests (node:test via tsx)
```

- Local demo admin: `demo@regreporting.network` with the password you set in `SEED_DEMO_PASSWORD` (local only —
  `db:seed` refuses to run in production).
- `npm run db:seed` resets members and community data but **keeps ingested updates**. Demo regulatory updates are
  loaded as *archived* so they never sit next to real regulator news; set `SEED_DEMO_UPDATES="true"` to publish them.

## Email (Gmail SMTP)

Platform emails (verification codes, suspension notices) are sent from **support.websitecreation@gmail.com**.

1. Sign in to that Google account and turn on 2-Step Verification.
2. Google Account → Security → *App passwords* → create one for "RegReporting Network".
3. Paste the 16-character password into `SMTP_PASS` in `.env` and restart the server.

While `SMTP_PASS` is empty, emails are not sent: they are recorded and readable at `/dev/mailbox` (development
only). Admin → Sources & Ingestion shows whether SMTP is configured and any delivery failures. Bodies of delivered
emails are never stored. Gmail limits sending volume; move to a transactional provider before launch.

## RegBot

RegBot follows the specification in `lib/regbot/systemPrompt.ts` (one-sentence answers by default, no invented
field counts, law vs guidance vs community kept separate).

- **Reference mode (default, free)** — prewritten answers in `lib/regbot/library.ts` (definitions, who regulates, why it
  matters, what is reported, comparisons, the reporting flow and the "depends on the specification" field-count answer),
  matched by `lib/regbot/libraryAnswer.ts`. Unmatched questions get an honest "not covered yet" answer; there is no
  demo corpus. Add entries to the library to extend RegBot; `npm test` checks every definition is one sentence.
- **Live mode (optional, paid)** — set `ANTHROPIC_API_KEY` (and optionally `REGBOT_MODEL`, default `claude-opus-5`). Each question is
  one Claude call that must answer through a structured tool; `lib/regbot/normalise.ts` validates the output, and
  source links come only from the official-domain registry, never from the model. There is no retrieval yet, so
  answers are labelled "AI-generated · verify against the official source". Limits: 20 questions/minute and
  40/hour per IP.
- Without a key RegBot never calls a paid API.

## Regulatory update ingestion

| Source | Feed |
| --- | --- |
| ESMA | `https://www.esma.europa.eu/rss.xml` |
| FCA | `https://www.fca.org.uk/news/rss.xml` |
| CFTC | `https://www.cftc.gov/RSS/RSSGP/rssgp.xml` |
| SEC | `https://www.sec.gov/news/pressreleases.rss` |
| BIS | `https://www.bis.org/doclist/all_pressrels.rss` |
| ISDA | `https://www.isda.org/feed/` |

DTCC and CPMI publish no feed — add their updates with **Admin → Sources & Ingestion → Add update manually**.

Pipeline (`lib/ingestion/`): fetch (20 s timeout, 5 MB cap, identifying User-Agent) → parse RSS 2.0 / RDF / Atom →
reject links that are not HTTPS on the source's official domain → skip items older than 120 days → de-duplicate by URL
→ classify relevance and topic → store as **pending review** (or **archived** when not reporting-relevant).
**Nothing is published automatically.** Run `npm run ingest` on a schedule (e.g. cron every 2 hours) or use the
"Fetch" buttons in Admin.

## Admin & moderation (`/admin`)

| Section | Who | Actions |
| --- | --- | --- |
| Regulatory Updates | Admin | Approve & publish, reject, archive/unpublish, edit title/summary/topics/severity, put in the alert banner |
| Sources & Ingestion | Admin | Feed health, fetch now, run history, manual entries, email delivery status |
| Reported Content | Moderator, Admin | Remove reported content (author notified), mark actioned, dismiss |
| Removed Content | Moderator, Admin | Restore |
| Members | Moderator, Admin | Verify practitioner, suspend (emailed, sessions revoked) / reinstate; admins change roles |
| Audit Log | Moderator, Admin | Every staff action with actor, target and detail |

Guards: staff cannot change their own role or suspend themselves; admins cannot be suspended; only active,
email-verified members can become staff. Publishing an update notifies members who follow that regulator.

## Structure

```
app/api/admin/*        ingest, updates (review/edit/manual), content, reports, users
app/api/*              auth, discussions, comments, votes, saves, follows, reports, profile, notifications, regbot, search
lib/ingestion/         feeds, parse, dates, classify, run
lib/services/          accounts, community, moderation (audited staff actions)
lib/repositories/      read queries + mappers (admin, community, updates, users, …)
lib/email/mailer.ts    SMTP with dev-mailbox fallback
prisma/                PostgreSQL schema, migrations, seed
scripts/ingest.ts      CLI entry for scheduled ingestion
tests/                 node:test suites
```

## Roadmap

1. **Phase 1** — UI, architecture, homepage, Radar, Community, RegBot UI, Challenges. ✅
2. **Phase 2** — Authentication, profiles, discussion creation, replies, voting, search. ✅
3. **Phase 3 (this build)** — PostgreSQL, regulatory update ingestion, admin review & moderation, audit log, SMTP email. ✅
4. **P0 community upgrade (this build)** — Online presence, notification types/filters/preferences, sharing (ShareButton, deep links, share telemetry), admin-suggestion polish, security-pattern extension. ✅ See `docs/ROADMAP.md`.
5. **Phase 4 / P1** — RegBot RAG: document ingestion, retrieval, LLM generation, citation verification; Knowledge Base → database; Open Graph previews.
6. **Phase 5 / P2** — Reputation ledger, practitioner verification requests, advanced gamification, regulatory calendar, Challenges-system consolidation.
