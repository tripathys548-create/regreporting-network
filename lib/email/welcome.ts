import { prisma } from "@/lib/db";
import { renderWelcomeEmail } from "@/lib/email/templates/welcome";
import { sendEmail } from "@/lib/email/mailer";

function firstName(displayName: string): string | null {
  const first = displayName.trim().split(/\s+/)[0];
  return first || null;
}

/**
 * Sends the one-time welcome email. Guarded by welcomeEmailSentAt: called again on login,
 * profile updates or re-verification, this is a no-op unless `force` (admin resend) is set.
 * Delivery failure never throws — account creation must never fail because email couldn't send.
 */
export async function sendWelcomeEmailOnce(userId: string, opts: { force?: boolean } = {}): Promise<{ sent: boolean; delivered: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user) return { sent: false, delivered: false };
  if (user.welcomeEmailSentAt && !opts.force) return { sent: false, delivered: false };

  const { subject, text, html } = renderWelcomeEmail({ firstName: user.profile ? firstName(user.profile.displayName) : null });

  let delivered = false;
  try {
    const result = await sendEmail({ to: user.email, subject, text, html, category: "welcome" });
    delivered = result.delivered;
  } catch (error) {
    console.error(`[welcome-email] unexpected failure for user=${userId}: ${error instanceof Error ? error.message : String(error)}`);
  }

  await prisma.user.update({ where: { id: userId }, data: { welcomeEmailSentAt: new Date(), welcomeEmailSentCount: { increment: 1 } } });
  return { sent: true, delivered };
}
