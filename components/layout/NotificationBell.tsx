"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { NOTIFICATION_META } from "@/lib/notifications";
import type { Notification } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { RelativeTime } from "@/components/ui/RelativeTime";

export function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  // Read state is persisted server-side; this set reflects changes made since the page rendered.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const isUnread = (n: Notification) => n.readAt === null && !readIds.has(n.id);
  const unread = notifications.filter(isUnread).length;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function markRead(ids?: string[]) {
    setReadIds((prev) => new Set([...Array.from(prev), ...(ids ?? notifications.map((n) => n.id))]));
    api.markNotificationsRead(ids).catch(() => {
      // Non-critical: the unread state will reappear on next load.
    });
  }

  return (
    // Below sm the dropdown anchors to the header row (see AppHeader) so it spans the screen instead of overflowing left.
    <div className="sm:relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-navy">{unread}</span>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-4 top-full z-50 mt-1 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-lg sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <p className="text-xs font-semibold">Notifications</p>
            <button type="button" disabled={unread === 0} onClick={() => markRead()} className="text-2xs font-medium text-accent hover:text-accent-strong disabled:text-muted">
              Mark all read
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No notifications yet. Follow discussions and experts to hear about new activity.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      if (isUnread(n)) markRead([n.id]);
                      setOpen(false);
                    }}
                    className={clsx("flex gap-2.5 px-3 py-2.5 hover:bg-canvas", isUnread(n) && "bg-accent-soft/50")}
                  >
                    <Icon name={NOTIFICATION_META[n.type]?.icon ?? "bell"} className={clsx("mt-0.5", n.type === "regulatory-alert" ? "text-signal" : "text-muted")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold">{n.title}</span>
                      <span className="block truncate text-xs text-body">{n.body}</span>
                      <RelativeTime iso={n.createdAt} className="mt-0.5 block text-2xs text-muted" />
                    </span>
                    {isUnread(n) && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line px-3 py-2 text-center text-xs font-medium text-accent hover:bg-canvas">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
