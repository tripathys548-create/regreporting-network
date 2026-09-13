import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/mailer";
import { generateVerificationCode, hashVerificationCode, safeEqualHex } from "./tokens";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export type VerifyResult = "verified" | "invalid" | "expired" | "locked" | "already-verified";

export async function issueVerificationCode(user: { id: string; email: string; displayName: string }): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const latest = await prisma.emailVerification.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, retryAfterSec: Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime())) / 1000) };
  }

  const code = generateVerificationCode();
  await prisma.$transaction([
    // Only the newest code is valid.
    prisma.emailVerification.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date() } }),
    prisma.emailVerification.create({ data: { userId: user.id, codeHash: hashVerificationCode(user.id, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) } }),
  ]);

  await sendEmail({
    to: user.email,
    subject: "Your RegReporting Network verification code",
    text: `Hello ${user.displayName},\n\nYour verification code is ${code}. It expires in 15 minutes.\n\nIf you did not create an account, you can ignore this email.`,
  });
  return { ok: true };
}

export async function verifyEmailCode(userId: string, code: string): Promise<VerifyResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return "invalid";
  if (user.emailVerifiedAt) return "already-verified";

  const pending = await prisma.emailVerification.findFirst({ where: { userId, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!pending) return "expired";
  if (pending.attempts >= MAX_ATTEMPTS) return "locked";
  if (pending.expiresAt < new Date()) return "expired";

  if (!safeEqualHex(pending.codeHash, hashVerificationCode(userId, code))) {
    await prisma.emailVerification.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } });
    return pending.attempts + 1 >= MAX_ATTEMPTS ? "locked" : "invalid";
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.emailVerification.update({ where: { id: pending.id }, data: { consumedAt: now } }),
    prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: now, status: "active" } }),
  ]);
  return "verified";
}
