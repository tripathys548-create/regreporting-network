# Online Member Presence

RegWorld shows an aggregate "N members online" count on the homepage and
`/community`. This document defines what "online" means, how it's computed,
and the privacy guarantees around it.

## Definition

A member counts as online when:

- They are authenticated (signed in), AND
- Their account is `active` (not suspended/pending), AND
- Their browser sent a heartbeat within the last `PRESENCE_ONLINE_WINDOW_MINUTES`
  minutes (default **5**).

There is no concept of "away" or "idle" — a member is either within the
window or not. Signed-out visitors are never counted.

## How it works

1. **Heartbeat.** `components/layout/PresenceHeartbeat.tsx` is mounted for
   every signed-in viewer (`app/layout.tsx`). It calls
   `POST /api/presence/heartbeat` once on page load and every 60 seconds
   while a tab stays open.
2. **Storage.** The heartbeat updates a single column, `User.lastSeenAt`. No
   separate presence/session table — this keeps the feature cheap and avoids
   a write-heavy table for an MVP-scale feature (see spec §53: don't
   over-engineer for scale that isn't needed yet).
3. **Read.** `GET /api/presence/online-count` counts
   `User` rows where `lastSeenAt` is within the window and `status = "active"`,
   cached in-memory for ~15 seconds (`lib/repositories/presence.ts`) so the
   homepage and `/community` don't hit Postgres on every request.

## Privacy

- The public API (`/api/presence/online-count`) returns **only**
  `{ onlineMembers: number }`. It never returns user ids, emails, sessions,
  or individual last-seen timestamps.
- The admin dashboard (`/admin?section=security`) additionally shows
  **Members online**, **Active today**, and **Active this week** — all
  aggregate counts, computed the same way, with no per-user detail exposed
  there either.
- **Known limitation (P0 scope):** there is no per-member "Show my online
  status: ON/OFF" toggle yet, because no per-user presence is displayed
  anywhere — only the aggregate count. If a future release adds per-user
  presence (e.g. "online" badges on profiles), that toggle must ship
  alongside it, not after.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `PRESENCE_ONLINE_WINDOW_MINUTES` | `5` | How recent a heartbeat must be to count as online |
| `RATE_LIMIT_PRESENCE_HEARTBEAT` | `2`/min per user | Heartbeat abuse guard |
| `RATE_LIMIT_ONLINE_COUNT` | `30`/min per IP | Online-count endpoint abuse guard |

## Scaling note

`lib/rateLimit.ts` and the online-count cache are both in-memory and
per-process. Behind more than one Node instance, heartbeats and the cached
count are not shared across instances — the online count will undercount
slightly and rate limits apply per-instance rather than globally. A shared
store (Redis) is the documented upgrade path — see `docs/ROADMAP.md`.
