import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/Field";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { safeNext } from "@/lib/auth/redirects";
import { requirePageSession } from "@/lib/auth/session";
import { emailDeliveryConfigured } from "@/lib/email/mailer";
import { firstParam, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNext(firstParam(searchParams, "next"));
  const session = await requirePageSession("/verify-email");
  if (session.user.emailVerifiedAt) redirect(next);

  return (
    <AuthShell title="Verify your email" description="One last step before you can post, reply and vote.">
      <VerifyEmailForm email={session.user.email} next={next} showDevMailbox={process.env.NODE_ENV !== "production" && !emailDeliveryConfigured()} />
    </AuthShell>
  );
}
