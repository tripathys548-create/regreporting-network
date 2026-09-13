"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      icon="check"
      disabled={disabled || busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.markNotificationsRead();
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      Mark all read
    </Button>
  );
}
