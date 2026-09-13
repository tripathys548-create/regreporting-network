"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { RegulatoryAlert } from "@/types";
import { Icon } from "@/components/ui/Icon";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

interface RegulatoryAlertBannerProps {
  /** Server-rendered alert so the banner is present on first paint. */
  initialAlert: RegulatoryAlert | null;
  /** Poll /api/alerts for changes. Disable in tests or static contexts. */
  live?: boolean;
}

/**
 * Global, always-visible regulatory alert strip.
 * Data-source agnostic: the server passes the current alert, then the banner
 * refreshes from /api/alerts — which later reads from the ingestion database.
 */
export function RegulatoryAlertBanner({ initialAlert, live = true }: RegulatoryAlertBannerProps) {
  const [alert, setAlert] = useState<RegulatoryAlert | null>(initialAlert);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      api
        .getActiveAlert()
        .then((res) => setAlert(res.alert))
        .catch(() => {
          // Keep showing the last known alert if a refresh fails.
        });
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [live]);

  if (!alert) return null;
  const { update, sourceShortName } = alert;
  const critical = update.severity === "critical";

  return (
    <div role="region" aria-label="Regulatory alert" className="border-b border-signal/30 bg-[#2A1A05] text-amber-50">
      <Link
        href={`/radar/${update.id}`}
        className="group mx-auto flex max-w-shell items-center gap-3 px-4 py-2 text-xs sm:px-6 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-300"
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-amber-400 px-1.5 py-0.5 font-mono text-2xs font-bold uppercase tracking-wider text-[#2A1A05]">
          <span className={critical ? "h-1.5 w-1.5 animate-pulse rounded-full bg-[#2A1A05]" : "h-1.5 w-1.5 rounded-full bg-[#2A1A05]"} aria-hidden />
          Regulatory Alert
        </span>
        <span className="min-w-0 truncate">
          <span className="font-semibold text-amber-200">{sourceShortName}</span>
          <span className="mx-1.5 text-amber-200/50" aria-hidden>
            ·
          </span>
          <span className="text-amber-50/95">{update.title}</span>
        </span>
        <span className="ml-auto hidden shrink-0 items-center gap-1 font-medium text-amber-200 group-hover:text-white sm:inline-flex">
          View the changes
          <Icon name="arrowRight" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
