import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { issueVerificationCode } from "@/lib/auth/verification";
import { jsonError, rejectCrossOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  const { user, profile } = auth.session;
  if (user.emailVerifiedAt) return jsonError("Your email address is already verified.", 400);

  const result = await issueVerificationCode({ id: user.id, email: user.email, displayName: profile.displayName });
  if (!result.ok) {
    return NextResponse.json({ error: `Please wait ${result.retryAfterSec} seconds before requesting another code.` }, { status: 429, headers: { "Retry-After": String(result.retryAfterSec) } });
  }
  return NextResponse.json({ ok: true });
}
