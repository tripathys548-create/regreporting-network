# Welcome email & newsletter subscription

## Environment variables

Already existed (reused, not duplicated):

| Variable | Purpose |
|---|---|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP transport (Gmail App Password). While `SMTP_PASS` is empty, every email is logged to `OutboundEmail` and shown at `/dev/mailbox` instead of being delivered. |
| `EMAIL_FROM` | From address. |
| `AUTH_SECRET` | Already used for session/verification tokens; now also used to derive unsubscribe tokens (HMAC, nothing extra to store). |

New:

| Variable | Purpose |
|---|---|
| `EMAIL_FROM_NAME` | Optional display name on the From header, e.g. `RegReporting Network`. |
| `SITE_URL` (or `NEXT_PUBLIC_SITE_URL`) | Absolute origin used to build links inside emails (confirm, unsubscribe, CTAs). Falls back to the production domain if unset — **set this explicitly in every environment**, including local dev, or emails will link to production. |

No transactional-email API provider (Resend/Postmark/SendGrid/Brevo) is configured. The existing SMTP mailer was reused per the "if one exists, reuse it" instruction. See **Analytics** below for what a provider would add and how to swap one in.

## Files changed / added

- **Schema** (`prisma/schema.prisma`, two migrations): `User.welcomeEmailSentAt` / `welcomeEmailSentCount`; new `NewsletterSubscription`, `NewsletterCampaign`, `NewsletterEvent`, `NewsletterSettings` models; `OutboundEmail.category` / `campaignId`.
- **Mailer**: `lib/email/mailer.ts` extended with `html`, `category`, `campaignId` (backward compatible — every existing call site still works unchanged).
- **Templates**: `lib/email/templates/{layout,welcome,newsletterConfirmation,newsletterCampaign}.ts` — shared branded HTML shell, three templates. (A fourth "unsubscribe confirmation" is a same-styled in-app page, not an email — see **Design choices**.)
- **Tokens**: `lib/newsletter/tokens.ts` — confirmation tokens (single-use, hashed, 48h expiry) and unsubscribe tokens (HMAC of the subscription id, never stored).
- **Services**: `lib/services/newsletter.ts` (subscribe/confirm/unsubscribe), `lib/services/newsletterCampaigns.ts` (create/edit/schedule/send), `lib/email/welcome.ts` (one-time send + admin force-resend), `lib/services/moderation.ts` (`resendWelcomeEmail`).
- **Repositories**: `lib/repositories/newsletter.ts` (admin stats), `lib/repositories/admin.ts` (new "Newsletter" section + welcome-email fields on the users list).
- **API routes**: `app/api/newsletter/{subscribe,confirm,unsubscribe}`, `app/api/newsletter/track/{open,click}`, `app/api/admin/newsletter/{campaigns,campaigns/[id],campaigns/[id]/preview,settings}`, plus `resend-welcome` added to the existing `app/api/admin/users/[id]` action switch.
- **UI**: `components/newsletter/{NewsletterSignupForm,NewsletterCTA}.tsx` (the one shared component, per spec), `components/admin/{NewsletterCampaignEditor,NewsletterSettingsForm}.tsx`, `app/welcome/page.tsx`, `app/newsletter/{confirm,unsubscribed}/page.tsx`, `app/privacy/page.tsx`. Newsletter opt-in checkbox added to `components/auth/SignupForm.tsx`. CTA wired into the homepage, footer, Regulatory Radar, Knowledge Base and Challenges pages, plus the admin dashboard's new "Newsletter" tab.
- **Cron-style script**: `scripts/send-scheduled-newsletter.ts` (`npm run newsletter:dispatch`) — same pattern as the existing `scripts/ingest.ts`.

## Welcome email flow

1. `POST /api/auth/signup` creates the account, starts the session, issues the verification code — then calls `sendWelcomeEmailOnce(userId)`.
2. That function checks `user.welcomeEmailSentAt`; if already set, it's a no-op. Otherwise it renders and sends the email, then sets `welcomeEmailSentAt` **regardless of delivery success** — a delivery failure is logged, not retried automatically, and never fails account creation.
3. Login, profile updates and re-verification never call this function, so they can't trigger a resend.
4. Admin → Members → **Resend welcome email** calls the same function with `force: true`, bypassing the guard, and writes an `AuditLog` row. The member row shows "Welcome email last sent: <date>" so this is a deliberate, visible action.

## Newsletter (double opt-in) flow

1. Any instance of `<NewsletterSignupForm>` (homepage, footer, Radar, Knowledge Base, Challenges, signup, `/welcome`) posts `{ email, consent, source }` to `/api/newsletter/subscribe`.
2. The account-creation checkbox is **unchecked by default** and is a completely separate field (`SignupInput.newsletterOptIn`) from `acceptGuidelines` — creating an account never implies newsletter consent.
3. `subscribeToNewsletter` creates (or reactivates) a row with `status: "pending"`, records `consentSource`, and emails a confirmation link with a single-use, hashed, 48h-expiring token.
4. Clicking the link (`GET /api/newsletter/confirm?token=...`) flips `status` to `"active"`, sets `confirmedAt`, and consumes the token. Nothing is "active" before this step.
5. Every campaign email carries a one-click unsubscribe link built from an HMAC of the subscription's own id under `AUTH_SECRET` — nothing to store or rotate, and it keeps working for every future send. Clicking it sets `status: "unsubscribed"`.
6. Logging back in, verifying email, or updating a profile never touches subscription status. Only submitting the subscribe form again (an explicit act) moves an unsubscribed row back to `pending`.
7. Resubmitting the confirm/unsubscribe link a second time is idempotent (`"already-unsubscribed"` / re-issues a fresh confirmation) rather than erroring.

## Admin capabilities (Admin → Newsletter)

- Subscriber stats: active, pending, unsubscribed, new this week, unsubscribes this week.
- Welcome email stats: sent / delivered / failed (from `OutboundEmail.category = "welcome"`).
- Automatic weekly sending toggle (admin-only), send day + time (UTC) — **disabled by default**, must be explicitly turned on.
- Campaigns: create draft → edit fields → **Preview** (renders the real HTML in a new tab) → **Send test** (to any address, doesn't touch real subscriber data or counts) → **Schedule** (date/time) or **Send now** (to every active subscriber; can't be undone, confirmed client-side). A sent campaign becomes read-only. Every action writes an `AuditLog` row.
- Per-campaign stats after sending: sent, opened, clicked, unsubscribed-since-sent.

## Automatic weekly sending

Toggling it on in Admin only sets a database flag — it does **not** start a background timer. Wire up a cron entry (identical operational pattern to the existing ingestion job, which already documents "schedule it with cron"):

```bash
# hourly is a good default
0 * * * * cd /path/to/app && npm run newsletter:dispatch >> /var/log/regreporting-newsletter.log 2>&1
```

The script checks `NewsletterSettings.enabled` and the day/time window itself, and sends the earliest campaign with `status: "scheduled"` whose `scheduledAt` has passed. If nothing is scheduled, it's a no-op. **This cron entry needs to be added on the server — it does not exist yet.**

## Analytics — what's real vs. what needs a provider

- **Sent / delivered / failed** (welcome emails and campaigns): real, from `OutboundEmail.status`, set by the SMTP mailer's own success/failure.
- **Opened / clicked**: real, self-hosted (a 1×1 tracking pixel and a click-redirect that logs to `NewsletterEvent` before forwarding) — this works with any mailer, not just providers with webhooks.
- **Bounced**: not implemented. Plain SMTP has no bounce webhook; a real bounce only shows up as an email to the From address's own inbox, which nothing here parses. If a transactional provider (Resend/Postmark/SendGrid/Brevo) is adopted later, its bounce webhook can post into the same `NewsletterEvent` table with `type: "bounced"` — the schema and admin UI already have room for it, it's just not wired up because there's no provider to receive the webhook from.

## Security

- Confirmation tokens: 32 random bytes, hashed (SHA-256) at rest, single-use (nulled on success), 48h expiry.
- Unsubscribe tokens: HMAC-SHA256 of the subscription id under `AUTH_SECRET`, timing-safe compared, never stored, never expire (so old campaign emails keep working).
- The newsletter click-tracking redirect resolves its destination from the campaign record server-side — the query string can't be used to build an open redirect.
- Rate limiting on `/api/newsletter/subscribe` (8/hour/IP), `/confirm` and `/unsubscribe` (30/hour/IP).
- All sending is server-side; no API keys reach the client. Admin newsletter routes require a staff (moderator/admin) session; the settings toggle requires admin.
- Subscriber email addresses are never exposed through a public API; the admin dashboard shows counts, not the list.

## Design choices worth knowing about

- **Unsubscribe confirmation is a page, not an email.** Sending an extra "you've been unsubscribed" email is common practice to skip (it can itself read as spam right after someone asked to stop hearing from you); the same branded confirmation is shown in-app at `/newsletter/unsubscribed` instead.
- **Test sends don't count toward analytics** — they use a placeholder subscription id, so pixel/click events for a test can't collide with real subscriber data (the insert is wrapped to fail silently if that placeholder doesn't exist).
- **`sentCount`** on a campaign only counts recipients the mailer actually reported as delivered — in this sandbox (no SMTP configured) it will show `0` even after "Send now" runs successfully; that's correct, not a bug.

## Remaining configuration for production

1. Set `SITE_URL` to the real deployed origin.
2. Set `SMTP_PASS` (or migrate to a transactional provider) so emails actually deliver instead of logging to `/dev/mailbox`.
3. Add the `newsletter:dispatch` cron entry if automatic weekly sending will be used.
4. Run `npx prisma migrate deploy` on the production database before/with the next deploy (two new migrations: `newsletter_and_welcome_email`, `drop_unsubscribe_token_hash`).
