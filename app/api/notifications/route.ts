import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { listNotifications } from "@/lib/repositories/notifications";

export const dynamic = "force-dynamic";

/** GET /api/notifications → { notifications } for the signed-in member. */
export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const notifications = await listNotifications(auth.session.user.id);
  return NextResponse.json({ notifications }, { headers: { "Cache-Control": "private, no-store" } });
}
