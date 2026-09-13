import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth/session";
import { issueVerificationCode } from "@/lib/auth/verification";
import { asRecord, clientIp, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { createAccount } from "@/lib/services/accounts";
import { validateSignup } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** POST /api/auth/signup — create an account with full professional details, sign in, send a verification code. */
export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const limited = limitOrNull(`signup:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (limited) return limited;

  // Honeypot: real users never see or fill this field. Respond as if successful.
  const website = asRecord(parsed.data).website;
  if (typeof website === "string" && website.trim() !== "") return NextResponse.json({ redirect: "/verify-email" }, { status: 201 });

  const result = validateSignup(parsed.data);
  if (!result.ok) return jsonError("Please fix the highlighted fields.", 422, { errors: result.errors });

  const created = await createAccount(result.value);
  if (!created.ok) return jsonError(created.error, created.status, created.status === 409 ? { errors: { email: created.error } } : {});

  await startSession(created.value.userId);
  await issueVerificationCode({ id: created.value.userId, email: result.value.email, displayName: result.value.displayName });
  return NextResponse.json({ redirect: "/verify-email" }, { status: 201 });
}
