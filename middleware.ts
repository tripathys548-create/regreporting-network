import { NextResponse, type NextRequest } from "next/server";
import { DEMO_SECTIONS_ENABLED } from "@/lib/features";

/** Sample-content sections answer with "Coming soon" (pages) or 404 (API) while hidden. See lib/features.ts. */
export function middleware(request: NextRequest) {
  if (DEMO_SECTIONS_ENABLED) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Not available" }, { status: 404 });
  return NextResponse.rewrite(new URL("/coming-soon", request.url));
}

export const config = {
  matcher: ["/knowledge/:path*", "/challenges/:path*", "/timeline/:path*", "/regbot/:path*", "/api/regbot/:path*"],
};
