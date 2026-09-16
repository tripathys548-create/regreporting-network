"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

const POLL_MS = 60_000;

/** "● N members online" badge. Public — works for signed-out viewers too. Polls the aggregate-only /api/presence/online-count endpoint. */
export function OnlineCount({ initial, className }: { initial: number; className?: string }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    const poll = () => {
      api
        .getOnlineCount()
        .then((r) => setCount(r.onlineMembers))
        .catch(() => {
          // Non-critical: keep showing the last known count.
        });
    };
    const id = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={className}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-good align-middle" aria-hidden="true" />
      {count.toLocaleString()} {count === 1 ? "member" : "members"} online
    </span>
  );
}
