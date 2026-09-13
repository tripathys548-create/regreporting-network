import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth/session";
import { rejectCrossOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  await endSession();
  return NextResponse.json({ ok: true });
}
