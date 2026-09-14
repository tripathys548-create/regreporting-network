import { renderNewsletterConfirmationEmail } from "@/lib/email/templates/newsletterConfirmation";
import { sendEmail } from "@/lib/email/mailer";
import { confirmationExpiry, generateOpaqueToken, hashOpaqueToken, verifyUnsubscribeToken } from "@/lib/newsletter/tokens";
import { prisma } from "@/lib/db";
import type { ServiceResult } from "./community";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SubscribeOutcome = "confirmation-sent" | "already-active" | "reconfirmation-sent";

/**
 * Creates or re-activates a pending subscription and emails a confirmation link.
 * Never marks a subscription active here — that only happens once the link is clicked (double opt-in).
 */
export async function subscribeToNewsletter(input: { email: string; consentSource: string; userId?: string | null }): Promise<ServiceResult<{ outcome: SubscribeOutcome }>> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return { ok: false, status: 422, error: "Enter a valid email address." };

  const existing = await prisma.newsletterSubscription.findUnique({ where: { email } });

  if (existing?.status === "active") {
    return { ok: true, value: { outcome: "already-active" } };
  }

  const rawConfirmToken = generateOpaqueToken();

  const record = existing
    ? await prisma.newsletterSubscription.update({
        where: { id: existing.id },
        data: {
          status: "pending",
          consentSource: input.consentSource,
          userId: input.userId ?? existing.userId,
          confirmationTokenHash: hashOpaqueToken(rawConfirmToken),
          confirmationTokenExpiresAt: confirmationExpiry(),
          unsubscribedAt: null,
        },
      })
    : await prisma.newsletterSubscription.create({
        data: {
          email,
          userId: input.userId ?? null,
          status: "pending",
          consentSource: input.consentSource,
          confirmationTokenHash: hashOpaqueToken(rawConfirmToken),
          confirmationTokenExpiresAt: confirmationExpiry(),
        },
      });

  const { subject, text, html } = renderNewsletterConfirmationEmail(rawConfirmToken);
  await sendEmail({ to: record.email, subject, text, html, category: "newsletter-confirmation" });

  return { ok: true, value: { outcome: existing ? "reconfirmation-sent" : "confirmation-sent" } };
}

export type ConfirmResult = "confirmed" | "invalid" | "expired";

export async function confirmNewsletterSubscription(rawToken: string): Promise<ConfirmResult> {
  const record = await prisma.newsletterSubscription.findUnique({ where: { confirmationTokenHash: hashOpaqueToken(rawToken) } });
  if (!record) return "invalid";
  if (!record.confirmationTokenExpiresAt || record.confirmationTokenExpiresAt < new Date()) return "expired";

  await prisma.newsletterSubscription.update({
    where: { id: record.id },
    data: { status: "active", confirmedAt: new Date(), confirmationTokenHash: null, confirmationTokenExpiresAt: null },
  });
  return "confirmed";
}

export type UnsubscribeResult = "unsubscribed" | "invalid" | "already-unsubscribed";

/** `subscriptionId` and `token` come from the unsubscribe link — see lib/newsletter/tokens.ts. */
export async function unsubscribeBySubscriptionToken(subscriptionId: string, token: string): Promise<UnsubscribeResult> {
  if (!verifyUnsubscribeToken(subscriptionId, token)) return "invalid";
  const record = await prisma.newsletterSubscription.findUnique({ where: { id: subscriptionId } });
  if (!record) return "invalid";
  if (record.status === "unsubscribed") return "already-unsubscribed";

  await prisma.newsletterSubscription.update({
    where: { id: record.id },
    data: { status: "unsubscribed", unsubscribedAt: new Date(), confirmationTokenHash: null, confirmationTokenExpiresAt: null },
  });
  return "unsubscribed";
}
