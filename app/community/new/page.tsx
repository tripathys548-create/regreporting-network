import type { Metadata } from "next";
import { NewDiscussionForm } from "@/components/community/NewDiscussionForm";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/States";
import { isTopicSlug } from "@/data/topics";
import { canPublish, requirePageSession } from "@/lib/auth/session";
import { firstParam, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Start a discussion" };

export default async function NewDiscussionPage({ searchParams }: { searchParams: SearchParams }) {
  const qs = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : []))).toString();
  const returnTo = `/community/new${qs ? `?${qs}` : ""}`;
  const session = await requirePageSession(returnTo);
  const category = firstParam(searchParams, "category") ?? "";

  return (
    <>
      <PageHeader eyebrow="Community" title="Start a discussion" description="Ask a specific, practical question. Well-scoped questions get better answers from practitioners." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="min-w-0 rounded-md border border-line bg-surface p-5">
          {canPublish(session.user) ? (
            <NewDiscussionForm
              initialTitle={(firstParam(searchParams, "title") ?? "").slice(0, 160)}
              initialCategory={isTopicSlug(category) ? category : undefined}
              fromRegBot={firstParam(searchParams, "from") === "regbot"}
            />
          ) : (
            <EmptyState
              icon="mail"
              title="Verify your email to post"
              description={`We sent a verification code to ${session.user.email}. Verified members can post, reply and vote.`}
              action={
                <ButtonLink href={`/verify-email?next=${encodeURIComponent(returnTo)}`} variant="primary" size="sm">
                  Enter verification code
                </ButtonLink>
              }
            />
          )}
        </div>
        <aside className="min-w-0 space-y-6">
          <Panel title="Writing a good question" icon="info">
            <ul className="space-y-2 text-xs text-body">
              {[
                "Name the regime and version (e.g. EMIR REFIT, UK EMIR).",
                "Describe the event type, action type or field involved.",
                "Say what you have already checked in official sources.",
                "Use synthetic values in examples — never real trade data.",
              ].map((tip) => (
                <li key={tip} className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-3.5 w-3.5 text-good" />
                  {tip}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="How moderation works" icon="shield">
            <ol className="space-y-2 text-xs text-body">
              <li>1. Only members with a verified email can post.</li>
              <li>2. Posting is rate-limited to prevent spam.</li>
              <li>3. Members report misleading claims or confidential data; moderators review reports.</li>
              <li>4. Accepted answers may be promoted to the Knowledge Base after editorial review.</li>
            </ol>
          </Panel>
        </aside>
      </div>
    </>
  );
}
