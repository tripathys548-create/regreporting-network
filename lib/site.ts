/**
 * Absolute site origin for links inside emails (which can't use relative URLs).
 * Set SITE_URL in production; falls back to the known deployment for safety.
 */
export function siteUrl(path = ""): string {
  const base = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://regworldcommsind.webelvate.com").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
