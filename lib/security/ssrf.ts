/**
 * SSRF protection for any server-side fetch triggered indirectly by user input
 * (RegBot regulatory-source retrieval, future link previews, etc).
 *
 * Rule: user input may select *which allowed source* to query, never an
 * arbitrary URL. There is no "user → arbitrary URL → server fetch" path in
 * this codebase, and none should be added without going through
 * `assertSafeRegulatorySource` below.
 */
import { securityConfig } from "./config";

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./, // link-local, includes cloud metadata (169.254.169.254)
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export class UnsafeSourceError extends Error {}

/** Throws if the URL is not HTTPS, not on the RegBot source allowlist, or resolves to a private/internal address. */
export function assertSafeRegulatorySource(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeSourceError("Not a valid URL.");
  }

  if (url.protocol !== "https:") {
    throw new UnsafeSourceError("Only HTTPS sources are allowed.");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(hostname))) {
    throw new UnsafeSourceError("Requests to internal or private addresses are not allowed.");
  }

  const allowed = securityConfig.regbotSourceAllowlist.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  if (!allowed) {
    throw new UnsafeSourceError(`Source domain "${hostname}" is not on the regulatory source allowlist.`);
  }

  return url;
}

/**
 * Fetch a regulatory source safely: validates the URL, disables automatic
 * redirect-following (so a 3xx to a private address cannot be used to bypass
 * the allowlist check), and re-validates the redirect target manually before
 * following it once.
 */
export async function fetchRegulatorySource(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  assertSafeRegulatorySource(rawUrl);
  const first = await fetch(rawUrl, { ...init, redirect: "manual" });

  if (first.status >= 300 && first.status < 400) {
    const location = first.headers.get("location");
    if (!location) return first;
    const nextUrl = new URL(location, rawUrl).toString();
    assertSafeRegulatorySource(nextUrl);
    return fetch(nextUrl, { ...init, redirect: "manual" });
  }

  return first;
}
