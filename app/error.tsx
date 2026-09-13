"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="This page failed to load"
        description="An unexpected error occurred. You can retry, or return to the dashboard."
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="primary" icon="refresh" onClick={reset}>
              Try again
            </Button>
            <ButtonLink size="sm" href="/">
              Go to dashboard
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
