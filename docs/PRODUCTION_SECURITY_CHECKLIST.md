# Production Security Checklist

Checked items reflect what is genuinely wired up in this codebase as of this
review. Anything requiring external configuration (Cloudflare, hosting,
email, monitoring) is marked accordingly — a checkbox here is not "done
forever"; re-verify after any infrastructure change.

- [x] HTTPS active in production, with a fallback HTTP→HTTPS redirect in `middleware.ts` (`next.config.js`, `middleware.ts`)
- [ ] Domain behind Cloudflare — **requires Cloudflare configuration**, see `docs/CLOUDFLARE_SETUP.md`
- [ ] DNS configured (proxied, not "DNS only") — **requires Cloudflare configuration**
- [ ] WAF enabled — **requires Cloudflare configuration**
- [x] Application-level rate limiting enabled (`lib/rateLimit.ts`, `lib/security/config.ts`, wired into auth/regbot/community/admin routes)
- [ ] Cloudflare edge rate limiting enabled — **requires Cloudflare configuration** (mirrors the app-level limits — see `docs/API_SECURITY_INVENTORY.md`)
- [ ] Bot protection configured — **requires Cloudflare configuration**
- [x] Security headers active (`next.config.js`: HSTS gated on production + explicit opt-in, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, CSP)
- [ ] Admin MFA enabled — **not implemented; requires an MFA provider decision** (see Known Limitations)
- [x] Secure cookies (`lib/auth/session.ts`: `httpOnly`, `sameSite=lax`, `secure` in production)
- [x] Database not directly internet-exposed beyond the managed provider's own network controls (Neon connection string is a private credential, never shipped to the client — see `lib/db.ts`)
- [x] Secrets stored in environment variables only — `DATABASE_URL`, `ANTHROPIC_API_KEY`, SMTP credentials are read via `process.env`, never hard-coded (verified by repo-wide secret scan below)
- [x] Production logs active (`lib/security/logger.ts` structured JSON logs; ships to whatever the hosting platform's stdout collector is)
- [x] Security alerts active — in-app admin notifications + `/admin?section=security` (`lib/security/alerts.ts`)
- [ ] Backup configured — **partially**: relies on Neon's built-in PITR (unconfirmed retention window), no supplemental export job — see `docs/DISASTER_RECOVERY.md`
- [ ] Error monitoring configured — **requires a Sentry (or equivalent) DSN**; `next.config.js` CSP already has a conditional `connect-src` entry for it, wiring is not otherwise implemented
- [x] RegBot rate limiting active (per-minute, per-hour-live, and per-tier daily quota — `app/api/regbot/route.ts`)
- [x] SSRF protection active for any future RegBot server-side source retrieval (`lib/security/ssrf.ts`, allowlist in `lib/security/config.ts`) — not yet exercised in production because RegBot does not currently fetch external URLs
- [x] Admin audit logging active, including security actions (`AuditLog` model, `lib/services/moderation.ts`, `lib/services/security.ts`, `lib/services/suggestions.ts`)
- [ ] Security testing completed — **automated unit/integration tests not yet written for this layer**; manual verification only (see Final Security Review below). Dev-only test routes exist at `/api/security-test/*`, 404 in production.

## Environment separation

| | Development | Staging | Production |
|---|---|---|---|
| HSTS | Off | Off | Off until `HSTS_ENABLED=true` is set explicitly, after HTTPS is confirmed stable |
| CSP | Report-Only | Report-Only (recommend switching to enforced once verified) | Enforced |
| Rate limits | Same code paths, same limits (tune via env if load-testing locally) | Same as production | Real limits from `lib/security/config.ts` |
| Logging | Verbose (console) | Same structured JSON as production | Structured JSON only, no verbose debug output |
| `/api/security-test/*` | Reachable | 404 (treated as production) | 404 (enforced in `middleware.ts` and again in each route) |
| Auth | Real sessions against local DB | Real sessions against staging DB | Real sessions against production DB — never share DB credentials across environments |

`next.config.js` and `middleware.ts` derive their behavior from
`NODE_ENV`/explicit env flags rather than hard-coded values, so a
misconfigured environment variable is the only way production protections
get silently weakened — audit `.env`/host environment settings as part of
any deploy change.

## Final security review

| Area | Status | Notes |
|---|---|---|
| Authentication | PASS | Password hashing (see `lib/auth/password.ts`), constant-time-shaped login (dummy hash comparison), session tokens hashed at rest, suspended accounts blocked |
| Authorization | PASS | `authorizeApi()` centralizes verified/staff/admin checks; every admin route audited for the correct role gate — see `docs/API_SECURITY_INVENTORY.md` |
| Input Validation | PASS | Per-endpoint validators in `lib/validation.ts` / `lib/services/*`; RegBot question length capped; suggestion secret-pattern guard |
| XSS Protection | PASS | React's default escaping throughout; no `dangerouslySetInnerHTML` found in a repo-wide search; CSP restricts `script-src 'self'` |
| Injection Protection | PASS | Prisma parameterizes all queries; no raw SQL string concatenation found in a repo-wide search |
| CSRF | PASS | `rejectCrossOrigin`/`parseMutation` on every mutating route; `SameSite=Lax` session cookie |
| SSRF | PASS | No user-supplied URL is ever fetched server-side today (ingestion feed URLs come from `data/*` config, not user input); `lib/security/ssrf.ts` allowlist + private-address blocking is in place ahead of any future RegBot retrieval feature |
| Rate Limiting | PASS | App-level limits on every auth/community/admin/RegBot mutation; centralized config; edge limiting still requires Cloudflare |
| Security Headers | PASS | See headers list above |
| Secrets Management | PASS | No hard-coded credentials found in a repo-wide search; all secrets via `process.env` |
| Audit Logging | PASS | `AuditLog` covers moderation, admin security actions, and suggestion triage, each with an actor, action, target, and optional request ID |

## Known limitations

The following still require external configuration, a provider decision, or
further work — they are not implemented and nothing in the UI claims
otherwise:

- **Cloudflare configuration** (WAF, edge rate limiting, bot protection, DDoS
  protection, DNS proxying) — see `docs/CLOUDFLARE_SETUP.md`. The admin
  Security Center labels each of these "Requires Cloudflare configuration"
  rather than showing them as active.
- **Hosting configuration** — origin-IP firewalling to Cloudflare's ranges
  only (see `docs/CLOUDFLARE_SETUP.md` step 11) has not been applied.
- **Database configuration** — backup retention window unconfirmed, no
  restore drill performed (see `docs/DISASTER_RECOVERY.md`).
- **Email provider** — outbound email delivery configuration (SMTP
  credentials, deliverability/DMARC setup) is outside this review's scope.
- **Monitoring provider** — no Sentry (or equivalent) DSN is wired up;
  `lib/security/logger.ts` and the security event pipeline are the only
  monitoring today.
- **MFA provider** — admin accounts do not support MFA. Adding it requires
  choosing a provider/library (e.g. TOTP via a package, or a hosted auth
  provider) — this is a product decision, not something silently defaulted.
- **Penetration testing / external security review** — not performed. This
  review was a code-level pass, not an external audit.

This work makes RegReporting Network substantially harder to abuse, easier
to monitor, and easier for administrators to respond to when something
suspicious happens. It does not make the application "100% secure" or
"unhackable" — no software is, and the limitations above are real gaps that
should be closed before this is treated as a fully hardened production
deployment.
