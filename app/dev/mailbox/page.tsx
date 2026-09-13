import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { EmptyState } from "@/components/ui/States";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Dev mailbox", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Development-only view of emails the app would have sent. Returns 404 in production. */
export default async function DevMailboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const emails = await prisma.outboundEmail.findMany({ orderBy: { createdAt: "desc" }, take: 20 });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Development only" title="Dev mailbox" description="Every email the app attempts to send. When SMTP is not configured, the full message is kept here so you can read verification codes." />
      {emails.length === 0 ? (
        <div className="rounded-md border border-line bg-surface">
          <EmptyState icon="mail" title="No emails sent yet" description="Create an account to generate a verification email." />
        </div>
      ) : (
        <ul className="space-y-3">
          {emails.map((m) => (
            <li key={m.id} className="rounded-md border border-line bg-surface">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-2">
                <p className="text-sm font-semibold text-ink">{m.subject}</p>
                <p className="text-2xs text-muted">
                  to <span className="font-mono">{m.to}</span> · <RelativeTime iso={m.createdAt.toISOString()} />
                </p>
              </div>
              <p className="px-4 pt-2 text-2xs font-semibold uppercase tracking-wide text-muted">
                {m.status === "sent" ? "Delivered via SMTP — content not stored" : m.status === "failed" ? `Delivery failed: ${m.error ?? "unknown error"}` : "Not delivered (SMTP not configured)"}
              </p>
              {m.body && <pre className="whitespace-pre-wrap px-4 py-3 font-sans text-sm text-body">{m.body}</pre>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
