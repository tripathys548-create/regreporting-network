import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { asRecord, parseMutation } from "@/lib/http";
import { markNotificationsRead } from "@/lib/repositories/notifications";

export const dynamic = "force-dynamic";

/** POST /api/notifications/read { ids? } — marks the given notifications (or all) as read. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { ids } = asRecord(parsed.data);
  const idList = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string").slice(0, 100) : undefined;
  const updated = await markNotificationsRead(auth.session.user.id, idList);
  return NextResponse.json({ updated });
}
