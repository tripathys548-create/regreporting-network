import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { authorizeApi, endSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { asRecord, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { securityConfig } from "@/lib/security/config";
import { deleteAccount } from "@/lib/services/accounts";

export const dynamic = "force-dynamic";

/** DELETE /api/account — permanently delete the signed-in member's account (password + "DELETE" confirmation). */
export async function DELETE(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const userId = auth.session.user.id;
  const limited = limitOrNull(`account-delete:${userId}`, securityConfig.rateLimits.login.limit, securityConfig.rateLimits.login.windowMs);
  if (limited) return limited;

  const body = asRecord(parsed.data);
  if (body.confirm !== "DELETE") return jsonError("Type DELETE to confirm.", 422, { errors: { confirm: "Type DELETE to confirm." } });
  if (auth.session.user.role === "admin") return jsonError("Admins can't delete their own account. Ask another admin to remove your admin role first.", 403);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  const password = typeof body.password === "string" ? body.password : "";
  if (!(await verifyPassword(password, user?.passwordHash ?? null))) {
    return jsonError("Password is incorrect.", 401, { errors: { password: "Password is incorrect." } });
  }

  await deleteAccount(userId);
  await endSession();
  return NextResponse.json({ ok: true });
}
