# Cloudflare Setup

This document walks through putting RegReporting Network behind Cloudflare:
DNS, CDN, WAF, rate limiting, bot protection, and DDoS protection. It is
written so an operator can follow it step by step; no credentials are
included — replace every placeholder before use.

Placeholders used throughout:

- `DOMAIN` — the production domain, e.g. `regworldcommsind.webelvate.com` or your own
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard URL or `wrangler whoami`
- `CLOUDFLARE_ZONE_ID` — from the zone's Overview page, right sidebar

Application-level rate limiting (`lib/security/config.ts`) is defense in
depth for a single Node process. **It is not a substitute for edge rate
limiting.** Cloudflare must also be configured — do not assume the app alone
can absorb a large traffic flood.

## 1. Add the domain to Cloudflare

1. Sign in to the Cloudflare dashboard.
2. **Add a site** → enter `DOMAIN`.
3. Choose a plan (Free is enough to start; Pro/Business unlock more WAF
   managed rules and analytics retention).
4. Cloudflare scans existing DNS records — review them before continuing.

## 2. Change DNS nameservers

1. Cloudflare shows two nameservers (e.g. `ns1.cloudflare.com`, `ns2.cloudflare.com`).
2. At your domain registrar, replace the existing nameservers with these two.
3. Propagation can take a few minutes to 24 hours. Cloudflare emails you once
   the zone is active.

## 3. Configure the DNS record for the application

1. In **DNS → Records**, add an `A` or `CNAME` record pointing `DOMAIN` (or a
   subdomain) at your hosting provider's address.
2. Set the record to **Proxied** (orange cloud) — not "DNS only" — so traffic
   passes through Cloudflare's network and the WAF/rate limiting below
   actually apply. A grey-cloud record bypasses all of Cloudflare's
   protection.

## 4. Enable HTTPS

1. **SSL/TLS → Overview**: set the encryption mode to **Full (strict)** once
   your origin has a valid certificate (most hosts, including Hostinger,
   provision one automatically via Let's Encrypt).
2. **SSL/TLS → Edge Certificates**: enable **Always Use HTTPS** so plain HTTP
   requests are redirected.
3. Do **not** enable HSTS yet — see step 4a.

### 4a. HSTS — enable only after confirming HTTPS works

HSTS is effectively irreversible once a browser has cached it (`max-age` is
typically a year). Enable it only after:

- `Always Use HTTPS` has been live for a few days without issues, and
- Every subdomain that resolves under `DOMAIN` also serves HTTPS correctly.

Then: **SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)**
→ enable, and separately set `HSTS_ENABLED=true` in the application's
production environment (see `next.config.js` — the app's own HSTS header
stays off until this flag is set, precisely to avoid enabling it "by
accident" during development).

## 5. Configure SSL/TLS

- **SSL/TLS → Edge Certificates**: enable **Minimum TLS Version 1.2**,
  **TLS 1.3**, and **Automatic HTTPS Rewrites**.
- Leave **Universal SSL** on for the edge certificate; pair it with your
  origin's own certificate for Full (strict) mode.

## 6. Enable appropriate security settings

- **Security → Settings**: set **Security Level** to Medium or High.
- **Security → Settings**: enable **Browser Integrity Check**.
- **Scrape Shield**: enable **Email Address Obfuscation**.

## 7. Enable WAF

1. **Security → WAF → Managed Rules**: turn on the **Cloudflare Managed
   Ruleset** and the **Cloudflare OWASP Core Ruleset**.
2. Add custom rules for the threat categories in the security spec — see
   `docs/PRODUCTION_SECURITY_CHECKLIST.md` and the WAF rule descriptions
   below. Test every custom rule in **Log** mode first, then switch to
   **Block** once you've confirmed it doesn't false-positive on legitimate
   regulatory terminology (see the WAF rules section below).

### WAF rule design notes

Target these threat categories with custom or managed rules:

- SQL injection, XSS, path traversal, command injection — covered by the
  OWASP Core Ruleset; verify none of it false-positives on the app's own
  query parameters (`?field=`, `?q=`) before enforcing.
- Unexpected HTTP methods — Cloudflare's managed rules plus this app's own
  `middleware.ts`, which already rejects anything outside
  GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS.
- Known exploit patterns — keep the Managed Ruleset auto-updated.
- Suspicious automated traffic — see Bot Fight Mode / Super Bot Fight Mode
  in step 9.

**Do not** write a custom WAF rule that blocks legitimate regulatory-reporting
terms. Confirmed-safe strings that must always pass through as normal search
input: `<field>` (a literal placeholder used in docs, not markup),
`UPI`, `UTI`, `ISIN`, `LEI`, `Part 43`, `Part 45`. If a managed ruleset's XSS
or injection heuristics ever flag these (e.g. a `<field>` value matching an
HTML-tag pattern), scope an exception rule for the affected path (e.g.
`/api/search`) rather than disabling the ruleset broadly.

## 8. Configure rate limiting

**Security → WAF → Rate limiting rules.** Mirror the endpoint limits already
enforced in `lib/security/config.ts` (`securityConfig.rateLimits`) at the
edge, using the dimensions noted per endpoint — see
`docs/API_SECURITY_INVENTORY.md` for the full endpoint table. Example rules:

| Rule | Match | Rate | Action |
|---|---|---|---|
| Login | `POST /api/auth/login` | 10 / 15 min per IP | Block, 15 min |
| Signup | `POST /api/auth/signup` | 5 / hour per IP | Block, 1 hour |
| RegBot | `POST /api/regbot` | 20 / min per IP, plus a separate rule keyed on the `rw_session` cookie if present | Challenge |
| Search | `GET /api/search` | 60 / min per IP | Block, 1 min |
| Community writes | `POST /api/discussions`, `/api/comments*` | 10–30 / hour per IP | Block, 1 hour |
| Admin API | `/api/admin/*` | 120 / min per IP | Block, 1 min |

Do not key every rule on IP address alone — a shared corporate NAT can put
hundreds of legitimate users behind one IP. Where the app has an
authenticated session, prefer a rule that matches on a cookie or a custom
header the origin can set (e.g. echo a hashed user ID back as
`X-RRN-User` from the origin so Cloudflare can rate-limit per user, not just
per IP) alongside the IP-based rule as a floor.

## 9. Configure bot protection

- **Security → Bots**: enable **Bot Fight Mode** (Free plan) or
  **Super Bot Fight Mode** (Pro+), which challenges traffic scored as
  automated.
- If available on your plan, enable **Bot Management** analytics to see bot
  score distributions before tightening enforcement.
- Apply stricter bot challenges to `/api/regbot`, `/api/auth/login`, and
  `/api/auth/signup` specifically, since these are the most abuse-prone
  endpoints (see `docs/API_SECURITY_INVENTORY.md`).

## 10. Configure security alerts

**Notifications** (top-level, or **Security → Events** on some plans):

1. Add a notification for **WAF events** above a threshold, and for
   **HTTP DDoS attack alerts**.
2. Send to an email distribution list or a webhook — do not route these to a
   single individual's inbox.
3. These are Cloudflare-side alerts and are separate from (complementary to)
   the application's own admin alert system (`/admin?section=security`,
   `lib/security/alerts.ts`).

## 11. Verify the application is actually behind Cloudflare

Do this after every step above, and periodically thereafter:

```bash
dig +short DOMAIN
```

The result should be Cloudflare IP ranges (`104.x`, `172.x`, `188.x`, etc. —
see https://www.cloudflare.com/ips/), not your origin's IP.

```bash
curl -sI https://DOMAIN | grep -i "cf-ray\|server"
```

A response header `cf-ray: ...` and `server: cloudflare` confirms traffic is
passing through Cloudflare. If either check fails, the DNS record is
"DNS only" (grey cloud) instead of "Proxied" (orange cloud) — fix that
first, since none of the WAF/rate-limiting/bot protection above applies to
unproxied traffic.

Finally, confirm the origin itself isn't directly reachable in a way that
bypasses Cloudflare: if your host exposes a raw IP or a `*.hostingprovider.com`
address, restrict inbound traffic at the host firewall to Cloudflare's IP
ranges only (see the same IP list above) so an attacker can't skip the edge
layer entirely by hitting the origin IP directly.

## What this buys you vs. what still needs Cloudflare configuration

The application ships with request IDs, structured logging, a security event
pipeline, progressive per-user/IP restrictions, and application-level rate
limits (see `lib/security/`). These work regardless of Cloudflare. But they
are not a substitute for edge protection against a genuine traffic flood —
only Cloudflare's network sits in front of the origin at that scale. Anywhere
this repo's admin dashboard or docs say **"Requires Cloudflare
configuration,"** it means exactly that: the code has an integration point
and a documented step here, but the control is not active until you complete
that step in the Cloudflare dashboard.
