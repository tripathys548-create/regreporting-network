import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { firstParam, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Confirm subscription", robots: { index: false } };

const COPY: Record<string, { icon: "check" | "alert"; title: string; description: string }> = {
  confirmed: { icon: "check", title: "✅ You're subscribed", description: "You'll receive the next RegReporting Network newsletter. Thanks for confirming." },
  expired: { icon: "alert", title: "This confirmation link has expired", description: "Confirmation links are valid for 48 hours. Subscribe again from the homepage to get a fresh one." },
  invalid: { icon: "alert", title: "This confirmation link isn't valid", description: "It may have already been used, or the link was copied incorrectly. Subscribe again from the homepage to get a fresh one." },
};

export default function NewsletterConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  const result = firstParam(searchParams, "result") ?? "invalid";
  const copy = COPY[result] ?? COPY.invalid;

  return (
    <div className="mx-auto max-w-md rounded-md border border-line bg-surface">
      <EmptyState
        icon={copy.icon === "check" ? "check" : "alert"}
        title={copy.title}
        description={copy.description}
        action={<ButtonLink href="/">Back to RegReporting Network</ButtonLink>}
      />
    </div>
  );
}
