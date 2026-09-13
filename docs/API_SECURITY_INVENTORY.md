# API Security Inventory

Every route under `app/api/`. "Rate limit" is the application-level limit
enforced in code today (`lib/rateLimit.ts` / `lib/security/config.ts`);
Cloudflare edge limits should mirror or exceed these — see
`docs/CLOUDFLARE_SETUP.md` step 8. "Risk" reflects impact if the endpoint is
abused or misused, not likelihood.

| Endpoint | Method | Auth required | Role | Rate limit (app) | Input validation | Sensitive | Risk |
|---|---|---|---|---|---|---|---|
| `/api/auth/login` | POST | No (creates session) | — | 10 / 15 min / IP | email + password shape | Yes (credentials) | HIGH |
| `/api/auth/signup` | POST | No | — | 5 / hour / IP | full signup schema (`lib/validation.ts`) | Yes (PII) | HIGH |
| `/api/auth/logout` | POST | Session cookie | any | — | — | No | LOW |
| `/api/auth/verify` | POST | Yes | any | 10 / 15 min / user | code shape | Yes (verification code) | MEDIUM |
| `/api/auth/resend` | POST | Yes | any | inherits verify-code cooldown | — | Yes (triggers email) | MEDIUM |
| `/api/regbot` | POST | No (tiered by session) | anonymous / member / admin | 20/min + daily quota (20/100/1000 by tier) + 40/hr live | question length ≤ 600, JSON shape, request-size cap | No (no PII expected, but see logging note below) | HIGH |
| `/api/search` | GET | No | — | 60 / min / IP | query length/shape | No | MEDIUM |
| `/api/discussions` | POST | Yes (verified) | member+ | 5 / hour / user | `validateNewDiscussion` | No | MEDIUM |
| `/api/discussions/[id]/comments` | POST | Yes (verified) | member+ | 20 / 10 min / user | `validateNewComment` | No | MEDIUM |
| `/api/comments/[id]/accept` | POST | Yes (verified) | discussion author | — | ownership check in service | No | LOW |
| `/api/votes` | POST | Yes (verified) | member+ | 60 / min / user | target type/id shape | No | LOW |
| `/api/saves` | POST | Yes | any | — | target id shape | No | LOW |
| `/api/follows` | POST | Yes | any | — | target type/id shape | No | LOW |
| `/api/reports` | POST | Yes | any | 10 / hour / user | reason enum, detail length | Yes (moderation context) | MEDIUM |
| `/api/suggestions` | POST | Yes (verified) | member+ | 10 / day / user | `validateNewSuggestion`, secret-pattern guard | Yes (security category may include vuln details) | MEDIUM |
| `/api/suggestions` | PATCH (vote) | Yes (verified) | member+ | 60 / min / user (shares vote bucket) | suggestion id shape | No | LOW |
| `/api/notifications` | GET | Yes | any | — | — | No | LOW |
| `/api/notifications/read` | POST | Yes | any | — | id list shape | No | LOW |
| `/api/profile` | PATCH | Yes | any | — | `validateProfileUpdate` | Yes (PII) | MEDIUM |
| `/api/alerts` | GET | No | — | — | — | No | LOW |
| **`/api/admin/ingest`** | POST | Yes | **admin** | 6 / 10 min / user | feed id enum | No | MEDIUM |
| **`/api/admin/content`** | POST | Yes | **moderator/admin** | — | target type/id, boolean | Yes (moderation) | MEDIUM |
| **`/api/admin/updates`** | POST | Yes | **admin** | — | `validateManualUpdate` | No | MEDIUM |
| **`/api/admin/updates/[id]`** | PATCH, POST | Yes | **admin** | — | edit/action validators | No | MEDIUM |
| **`/api/admin/reports/[id]`** | POST | Yes | **moderator/admin** | — | resolution enum | Yes (moderation) | MEDIUM |
| **`/api/admin/users/[id]`** | POST | Yes | **moderator/admin** (role change: admin only) | — | action enum, self-demotion guard | Yes (account/role changes) | CRITICAL |
| **`/api/admin/security`** | POST | Yes | **admin** | 120 / min / user (default admin bucket) | action enum per branch | Yes (security operations) | CRITICAL |
| **`/api/admin/suggestions/[id]`** | PATCH | Yes | **moderator/admin** | — | status enum | No | LOW |
| `/api/security-test/rate-limit` | GET | No | — | 3 / min / IP | — | No | N/A — dev only, 404s in production |
| `/api/security-test/auth` | GET | Yes | admin | — | — | No | N/A — dev only, 404s in production |

## Notes

- **CSRF**: every mutating route goes through `parseMutation`/`rejectCrossOrigin`
  (`lib/http.ts`), which rejects cross-origin browser requests when an
  `Origin` header is present and doesn't match the request host. Session
  cookies are also `SameSite=Lax`.
- **RegBot logging**: full question/answer conversations are not persisted
  server-side beyond what's needed to serve the response (see
  `lib/regbot/*`). If conversation storage is added later, it needs explicit
  privacy controls per section 18 of the security spec before shipping.
- **Admin-only rows** (bold) are the highest-value targets — a compromised
  admin session or a missing `authorizeApi({ admin: true })` check here has
  the largest blast radius. These were the first checked in the final review
  (`docs/PRODUCTION_SECURITY_CHECKLIST.md`).
- Rate limits are process-local (`lib/rateLimit.ts` is an in-memory fixed
  window). Running more than one Node instance without a shared store (e.g.
  Redis) under-counts requests across instances — Cloudflare's edge rate
  limiting does not have this limitation and is the primary defense at scale.
