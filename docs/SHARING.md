# Sharing

`components/ui/ShareButton.tsx` is the single reusable share control, mounted
on:

- Community discussions (`app/community/[slug]/page.tsx`)
- Regulatory Radar updates (`app/radar/[id]/page.tsx`)
- Knowledge Base articles (`app/knowledge/[slug]/page.tsx`)

## Behaviour

- On a device that supports the **Web Share API** (`navigator.share`,
  typically mobile), clicking "Share" opens the native OS share sheet
  directly — no custom menu.
- Elsewhere, it opens a small menu: **Copy Link**, **WhatsApp**,
  **LinkedIn**, **Email**, **X**.
- The WhatsApp message is always: title, then a short excerpt, then
  `Join the discussion: <deep link>` — never just the homepage (spec §21).
- Every share always uses the content's own stable URL
  (`/community/<slug>`, `/radar/<id>`, `/knowledge/<slug>`), built
  server-side with `lib/site.ts`'s `siteUrl()` so it's a real absolute URL
  even if the app is opened at a different host.

## Telemetry

`ShareEvent` (`prisma/schema.prisma`) records `contentType`, `contentId`,
`method`, an optional `userId` (nullable — anonymous shares are captured
too), and `createdAt`. Written by `POST /api/share-events`
(`lib/repositories/shareEvents.ts`), called fire-and-forget from
`ShareButton` — a failed telemetry write never blocks or delays the actual
share action.

## Deferred to P1

**Open Graph previews** (dynamic `opengraph-image` routes so shared links
render a rich card on WhatsApp/LinkedIn/X/iMessage) are explicitly P1 per
the spec's own implementation order (§62) and are not built in this pass —
see `docs/ROADMAP.md`. Links still work and deep-link correctly; they just
render as a plain link until Open Graph images ship.
