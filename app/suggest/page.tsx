import type { Metadata } from "next";
import { SuggestionForm } from "@/components/SuggestionForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { requirePageSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Suggest an improvement" };
export const dynamic = "force-dynamic";

export default async function SuggestPage() {
  await requirePageSession("/suggest");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Feedback" title="💡 Suggest an improvement" description="Report a bug, request a feature, or flag a security concern. Admins triage every submission." />
      <Panel bodyClassName="p-5">
        <SuggestionForm />
      </Panel>
    </div>
  );
}
