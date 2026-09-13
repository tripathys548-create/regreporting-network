import { NextResponse } from "next/server";
import { authorizeApi } from "@/lib/auth/session";
import { jsonError, parseMutation } from "@/lib/http";
import { updateProfile } from "@/lib/services/accounts";
import { validateProfileUpdate } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** PATCH /api/profile — update the signed-in member's professional details. */
export async function PATCH(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const result = validateProfileUpdate(parsed.data);
  if (!result.ok) return jsonError("Please fix the highlighted fields.", 422, { errors: result.errors });

  await updateProfile(auth.session.user.id, result.value);
  return NextResponse.json({ ok: true });
}
