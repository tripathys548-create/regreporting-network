import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Development-only route for exercising authorization checks (anonymous,
 * signed-in, staff, admin) in integration tests. 404s outside development.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });
  const auth = await authorizeApi({ admin: true });
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, userId: auth.session.user.id });
}
