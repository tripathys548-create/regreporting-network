"use client";

import { useEffect } from "react";

const INTERVAL_MS = 60_000;

/** Mounted once for signed-in viewers (see app/layout.tsx). Sends a heartbeat on mount and every 60s so /api/presence/online-count reflects active members. Renders nothing. */
export function PresenceHeartbeat() {
  useEffect(() => {
    const send = () => {
      fetch("/api/presence/heartbeat", { method: "POST", keepalive: true }).catch(() => {
        // Non-critical: a missed heartbeat just means this member drops out of the online count a little early.
      });
    };
    send();
    const id = window.setInterval(send, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
