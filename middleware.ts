import { NextResponse, type NextRequest } from "next/server";

/*
 * Edge-adjacent middleware. This runs inside the Next.js server, one layer in
 * from Cloudflare — it is NOT a substitute for Cloudflare's own WAF/rate
 * limiting/bot protection (see docs/CLOUDFLARE_SETUP.md), but it gives every
 * request a request ID for tracing and closes a few gaps Cloudflare doesn't
 * cover by default (blocking obviously-wrong HTTP methods, dev-only routes
 * in production, HTTP→HTTPS redirect as a fallback if it ever runs without
 * Cloudflare in front of it).
 */

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export function middleware(request: NextRequest) {
  // Fallback HTTP→HTTPS redirect. In production Cloudflare's "Always Use
  // HTTPS" setting should make this unreachable — see docs/CLOUDFLARE_SETUP.md.
  const proto = request.headers.get("x-forwarded-proto");
  if (process.env.NODE_ENV === "production" && proto === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  if (!ALLOWED_METHODS.has(request.method)) {
    return new NextResponse(null, { status: 405 });
  }

  // Security-test routes exist for local/dev verification only (section 25 of
  // the security spec) and must never be reachable in production.
  if (process.env.NODE_ENV === "production" && request.nextUrl.pathname.startsWith("/api/security-test/")) {
    return new NextResponse(null, { status: 404 });
  }

  const requestId = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const response = NextResponse.next({ request: { headers: new Headers(request.headers) } });
  response.headers.set("X-Request-Id", `rw-${requestId}`);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
