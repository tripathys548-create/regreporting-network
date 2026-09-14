import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";
import { firstParam, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Unsubscribed", robots: { index: false } };

const COPY: Record<string, { title: string; description: string }> = {
  unsubscribed: { title: "You're unsubscribed", description: "You won't receive further RegReporting Network newsletter emails. You can resubscribe at any time from the homepage." },
  "already-unsubscribed": { title: "You're already unsubscribed", description: "This address isn't receiving the newsletter. You can resubscribe at any time from the homepage." },
  invalid: { title: "This unsubscribe link isn't valid", description: "It may have been copied incorrectly. Use the unsubscribe link from the most recent newsletter email instead." },
};

export default function NewsletterUnsubscribedPage({ searchParams }: { searchParams: SearchParams }) {
  const result = firstParam(searchParams, "result") ?? "invalid";
  const copy = COPY[result] ?? COPY.invalid;

  return (
    <div className="mx-auto max-w-md rounded-md border border-line bg-surface">
      <EmptyState icon="check" title={copy.title} description={copy.description} action={<ButtonLink href="/">Back to RegReporting Network</ButtonLink>} />
    </div>
  );
}
