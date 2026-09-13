/** @type {import('next').NextConfig} */

// See docs/PRODUCTION_SECURITY_CHECKLIST.md and section "HTTPS" below for the
// dev/staging/production distinction this file encodes.
const isProduction = process.env.NODE_ENV === "production";

// HSTS is irreversible in practice (browsers cache it for `max-age`), so it is
// only ever sent once HTTPS is confirmed working in production AND an operator
// has explicitly opted in via HSTS_ENABLED=true. Never enable it by default in
// development or staging.
const hstsEnabled = isProduction && process.env.HSTS_ENABLED === "true";

// Content-Security-Policy. Next.js's App Router does not require unsafe-eval;
// 'unsafe-inline' on style-src covers Tailwind's injected <style> tags (no
// nonce-based alternative exists for that yet) — documented here rather than
// silently added. Tighten further if a nonce strategy is introduced.
const CSP_CONNECT_SRC = ["'self'", process.env.NEXT_PUBLIC_SENTRY_DSN ? "https://*.ingest.sentry.io" : ""].filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src ${CSP_CONNECT_SRC}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  ...(hstsEnabled ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Report-only outside production so a CSP mistake never breaks a live deploy
  // before it's been verified against real asset/domain usage.
  { key: isProduction ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
