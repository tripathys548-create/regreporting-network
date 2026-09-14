import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@/lib/db";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML body. Templates always provide a text alternative too (deliverability + accessibility). */
  html?: string;
  /** welcome | verification | newsletter-confirmation | newsletter-campaign | other — for admin analytics. */
  category?: string;
  campaignId?: string;
}

/*
 * SMTP delivery (configured for Gmail: smtp.gmail.com:465 with an App Password).
 * If SMTP_PASS is not set, messages are recorded in OutboundEmail and shown at
 * /dev/mailbox instead. Bodies of delivered messages are never stored, because
 * they can contain verification codes.
 *
 * EMAIL_FROM / EMAIL_FROM_NAME set the From address and display name for every
 * outgoing email (welcome, verification, newsletter). No transactional-email API
 * provider (Resend/Postmark/etc.) is configured — see docs/EMAIL_AND_NEWSLETTER.md
 * for what that would add (bounce webhooks) and how to swap one in later.
 */

let cached: Transporter | null | undefined;

function transport(): Transporter | null {
  if (cached !== undefined) return cached;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cached = null;
    return cached;
  }
  const port = Number(SMTP_PORT ?? 465);
  cached = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return cached;
}

export function emailDeliveryConfigured(): boolean {
  return transport() !== null;
}

export async function sendEmail(message: EmailMessage): Promise<{ delivered: boolean }> {
  const smtp = transport();
  const category = message.category ?? "other";
  const campaignId = message.campaignId;

  if (!smtp) {
    await prisma.outboundEmail.create({ data: { to: message.to, subject: message.subject, body: message.text, status: "logged", category, campaignId } });
    if (process.env.NODE_ENV === "production") console.warn("[mail] SMTP is not configured; email was not delivered.");
    else console.info(`[mail] (not delivered — SMTP_PASS not set) to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { delivered: false };
  }

  const fromName = process.env.EMAIL_FROM_NAME;
  const fromAddress = process.env.EMAIL_FROM ?? process.env.SMTP_USER;
  const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;

  try {
    await smtp.sendMail({ from, to: message.to, subject: message.subject, text: message.text, html: message.html });
    await prisma.outboundEmail.create({ data: { to: message.to, subject: message.subject, status: "sent", category, campaignId } });
    return { delivered: true };
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 300);
    console.error(`[mail] delivery failed to=${message.to}: ${detail}`);
    await prisma.outboundEmail.create({ data: { to: message.to, subject: message.subject, status: "failed", error: detail, category, campaignId } });
    return { delivered: false };
  }
}
