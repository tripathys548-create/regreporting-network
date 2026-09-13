import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { verifyEmailCode } from "@/lib/auth/verification";
import { asRecord, jsonError, limitOrNull, parseMutation } from "@/lib/http";

export const dynamic = "force-dynamic";

const MESSAGES = {
  invalid: { status: 400, error: "That code is not correct." },
  expired: { status: 400, error: "This code has expired. Request a new one." },
  locked: { status: 429, error: "Too many incorrect attempts. Request a new code." },
} as const;

export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const limited = limitOrNull(`verify:${auth.session.user.id}`, 10, 15 * 60 * 1000);
  if (limited) return limited;

  const code = String(asRecord(parsed.data).code ?? "").trim();
  if (!/^\d{6}$/.test(code)) return jsonError("Enter the 6-digit code from the email.", 422, { errors: { code: "Enter the 6-digit code." } });

  const result = await verifyEmailCode(auth.session.user.id, code);
  if (result === "verified" || result === "already-verified") return NextResponse.json({ ok: true });
  const { status, error } = MESSAGES[result];
  return jsonError(error, status, { errors: { code: error } });
}
