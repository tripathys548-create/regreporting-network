# Notifications

## Types

Defined in `types/notification.ts` (`NotificationType`), with icon/label/description
metadata in `lib/notifications.ts` (`NOTIFICATION_META`):

| Type | Category | Trigger |
|---|---|---|
| `reply` | Community | Someone replies to your discussion, or your answer is accepted |
| `mention` | Community | A member `@handles` you in a reply |
| `followed-discussion` | Community | New reply on a discussion you follow |
| `followed-topic` | Community | New discussion posted in a topic you follow (EMIR, UTI, DTCC, etc.) |
| `regulatory-alert` | Regulatory | An update is promoted to the site-wide alert banner |
| `followed-source` | Regulatory | New update from a source you follow |
| `challenge` | System | Daily/new challenge availability |
| `suggestion` | System | Admin-only: a member submitted a suggestion |
| `admin-announcement` | System | Site-wide announcement sent by an admin |

**Known gap (documented, not silently skipped):** the spec's full list also
asks for `NEW_KNOWLEDGE_ARTICLE`, `NEW_RESEARCH_DOCUMENT`, and `NEW_EVENT`.
`NEW_KNOWLEDGE_ARTICLE` has no safe trigger yet because the Knowledge Base is
still static content (`data/knowledge.ts`) with no publish workflow — it
needs the Knowledge DB migration (tracked in `docs/ROADMAP.md`) first.
`NEW_RESEARCH_DOCUMENT` and `NEW_EVENT` are not implemented because RegWorld
has no Research Document or Event content type at all — inventing a
notification trigger for content that doesn't exist would mean generating
fake activity, which this project explicitly avoids.

## Delivery

In-app only for P0 (bell dropdown + `/notifications`), plus an opt-in
**weekly email digest** toggle that reuses the existing `OutboundEmail`/SMTP
pipeline (no new email provider). WhatsApp delivery is intentionally not
implemented — the spec withholds it until a WhatsApp provider is configured.

## Preferences

`NotificationPreference` (one row per user, `prisma/schema.prisma`) with a
boolean per category plus `emailDigest`. Defaults are all `true` except
`emailDigest` (`false`). Manage at `/settings/notifications`
(`components/profile/NotificationPreferencesForm.tsx`), API at
`GET/PATCH /api/notifications/preferences`.

Every fan-out notification creator (`lib/services/community.ts`,
`lib/services/moderation.ts`) calls `filterByPreference()`
(`lib/repositories/notifications.ts`) before writing rows, so a member who
opts out never gets a `Notification` row created for that category in the
first place — not just hidden client-side.

## Filters

`/notifications` groups types into **All / Regulatory / Community / System**
via `NOTIFICATION_CATEGORY` (`lib/notifications.ts`), selected with
`?category=`.

## Admin broadcast

Admins can send a site-wide `admin-announcement` from
`/admin?section=users` ("Broadcast announcement"). It fans out to every
active member who hasn't disabled `adminAnnouncements`, rate-limited to a
handful per hour, and is written to `AuditLog`.
