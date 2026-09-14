import { NextResponse } from "next/server";
import { startSession } from "@/lib/auth/session";
import { issueVerificationCode } from "@/lib/auth/verification";
import { sendWelcomeEmailOnce } from "@/lib/email/welcome";
import { asRecord, clientIp, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { createAccount } from "@/lib/services/accounts";
import { subscribeToNewsletter } from "@/lib/services/newsletter";
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

  // Neither of these may fail account creation: log and move on if either has a problem.
  try {
    await sendWelcomeEmailOnce(created.value.userId);
  } catch (error) {
    console.error(`[signup] welcome email failed for user=${created.value.userId}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (result.value.newsletterOptIn) {
    try {
      await subscribeToNewsletter({ email: result.value.email, consentSource: "signup", userId: created.value.userId });
    } catch (error) {
      console.error(`[signup] newsletter opt-in failed for user=${created.value.userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return NextResponse.json({ redirect: "/verify-email?next=%2Fwelcome" }, { status: 201 });
}
