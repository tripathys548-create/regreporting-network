import { NextResponse } from "next/server";
import { getDummyHash, verifyPassword } from "@/lib/auth/password";
import { safeNext } from "@/lib/auth/redirects";
import { startSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { asRecord, clientIp, jsonError, limitOrNull, parseMutation } from "@/lib/http";
import { validateLogin } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseMutation(request);
  if (!parsed.ok) return parsed.response;

  const limited = limitOrNull(`login:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (limited) return limited;

  const result = validateLogin(parsed.data);
  if (!result.ok) return jsonError("Enter your email and password.", 422, { errors: result.errors });

  const user = await prisma.user.findUnique({ where: { email: result.value.email }, include: { profile: true } });
  // Always run a hash comparison so response time does not reveal whether the account exists.
  const passwordOk = await verifyPassword(result.value.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.passwordHash || !passwordOk || !user.profile) return jsonError("Email or password is incorrect.", 401);
  if (user.status === "suspended") return jsonError("This account has been suspended. Contact the moderators.", 403);

  await startSession(user.id);
  const next = safeNext(typeof asRecord(parsed.data).next === "string" ? (asRecord(parsed.data).next as string) : null);
  return NextResponse.json({ redirect: user.emailVerifiedAt ? next : `/verify-email?next=${encodeURIComponent(next)}` });
}
