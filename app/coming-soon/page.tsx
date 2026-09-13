import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "Coming soon" };

export default function ComingSoonPage() {
  return (
    <div className="mx-auto max-w-xl rounded-md border border-line bg-surface py-8">
      <EmptyState
        icon="layers"
        title="Coming soon"
        description="This section is being prepared with verified content. Meanwhile, follow official publications on the Regulatory Radar or ask practitioners in the Community."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/radar" size="sm" variant="primary">
              Regulatory Radar
            </ButtonLink>
            <ButtonLink href="/community" size="sm">
              Community
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
