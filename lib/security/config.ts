/**
 * Centralized security configuration. Every rate limit, quota, threshold, and
 * duration used by the security layer lives here — never hard-code these
 * numbers elsewhere. Everything is overridable via environment variables so
 * operators can tune behaviour without a code change.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const securityConfig = {
  /** Per-endpoint edge/app rate limits: { limit, windowMs }. Cloudflare should mirror these at the edge — see docs/CLOUDFLARE_SETUP.md. */
  rateLimits: {
    login: { limit: envInt("RATE_LIMIT_LOGIN", 10), windowMs: 15 * MIN },
    signup: { limit: envInt("RATE_LIMIT_SIGNUP", 5), windowMs: HOUR },
    regbotPerMinute: { limit: envInt("RATE_LIMIT_REGBOT_MIN", 20), windowMs: MIN },
    regbotLivePerHour: { limit: envInt("RATE_LIMIT_REGBOT_LIVE_HOUR", 40), windowMs: HOUR },
    search: { limit: envInt("RATE_LIMIT_SEARCH", 60), windowMs: MIN },
    discussionCreate: { limit: envInt("RATE_LIMIT_DISCUSSION_CREATE", 10), windowMs: HOUR },
    commentCreate: { limit: envInt("RATE_LIMIT_COMMENT_CREATE", 30), windowMs: HOUR },
    vote: { limit: envInt("RATE_LIMIT_VOTE", 120), windowMs: HOUR },
    suggestion: { limit: envInt("RATE_LIMIT_SUGGESTION", 10), windowMs: DAY },
    report: { limit: envInt("RATE_LIMIT_REPORT", 20), windowMs: HOUR },
    adminAction: { limit: envInt("RATE_LIMIT_ADMIN_ACTION", 120), windowMs: MIN },
    ingest: { limit: envInt("RATE_LIMIT_INGEST", 6), windowMs: 10 * MIN },
    defaultApi: { limit: envInt("RATE_LIMIT_DEFAULT", 120), windowMs: MIN },
  },

  /** RegBot daily question quotas by tier. Configurable, not hard-coded per call site. */
  regbotQuotas: {
    anonymous: envInt("REGBOT_QUOTA_ANONYMOUS", 20),
    member: envInt("REGBOT_QUOTA_MEMBER", 100),
    admin: envInt("REGBOT_QUOTA_ADMIN", 1000),
    maxQuestionLength: envInt("REGBOT_MAX_QUESTION_LENGTH", 600),
    maxOutputTokens: envInt("REGBOT_MAX_OUTPUT_TOKENS", 1024),
  },

  /** Maximum accepted request body sizes, in bytes, by category. */
  maxRequestBytes: {
    default: envInt("MAX_REQUEST_BYTES_DEFAULT", 16 * 1024),
    regbot: envInt("MAX_REQUEST_BYTES_REGBOT", 4 * 1024),
    upload: envInt("MAX_REQUEST_BYTES_UPLOAD", 5 * 1024 * 1024),
  },

  /** Progressive-control durations. A single bad signal never bans; it moves a level. */
  restrictionDurations: {
    watchMs: envInt("RESTRICTION_WATCH_MS", HOUR),
    rateLimitedMs: envInt("RESTRICTION_RATE_LIMITED_MS", HOUR),
    challengeMs: envInt("RESTRICTION_CHALLENGE_MS", 6 * HOUR),
    restrictedMs: envInt("RESTRICTION_RESTRICTED_MS", DAY),
    defaultAdminRestrictionMs: envInt("RESTRICTION_ADMIN_DEFAULT_MS", HOUR),
  },

  /** Thresholds that promote raw signals into a risk-classified security event. */
  thresholds: {
    loginFailuresPerWindow: envInt("THRESHOLD_LOGIN_FAILURES", 5),
    loginFailureWindowMs: envInt("THRESHOLD_LOGIN_FAILURE_WINDOW_MS", 15 * MIN),
    signupsPerIpPerDay: envInt("THRESHOLD_SIGNUPS_PER_IP_DAY", 8),
    discussionsPerUserPerHour: envInt("THRESHOLD_DISCUSSIONS_PER_HOUR", 6),
    commentsPerUserPerHour: envInt("THRESHOLD_COMMENTS_PER_HOUR", 20),
    votesPerUserPerHour: envInt("THRESHOLD_VOTES_PER_HOUR", 100),
    regbotQueriesPerHour: envInt("THRESHOLD_REGBOT_PER_HOUR", 30),
    searchesPerHour: envInt("THRESHOLD_SEARCHES_PER_HOUR", 150),
  },

  /** Alert aggregation window: related events within this window collapse into one admin alert. */
  alertAggregationWindowMs: envInt("ALERT_AGGREGATION_WINDOW_MS", 10 * MIN),

  /** Domains RegBot's server-side retrieval is allowed to fetch from. SSRF protection — see lib/security/ssrf.ts. */
  regbotSourceAllowlist: envList("REGBOT_SOURCE_ALLOWLIST", [
    "esma.europa.eu",
    "fca.org.uk",
    "cftc.gov",
    "sec.gov",
    "mas.gov.sg",
    "bis.org",
    "fatf-gafi.org",
    "isda.org",
    "dtcc.com",
  ]),

  /** Public/security contact — configure via env once a dedicated mailbox exists. */
  securityContactEmail: process.env.SECURITY_CONTACT_EMAIL || "security@example.com (placeholder — configure SECURITY_CONTACT_EMAIL)",
} as const;

export type SecurityConfig = typeof securityConfig;
