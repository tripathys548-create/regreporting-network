import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { MarkAllReadButton } from "@/components/profile/MarkAllReadButton";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { EmptyState } from "@/components/ui/States";
import { requirePageSession } from "@/lib/auth/session";
import { NOTIFICATION_META } from "@/lib/notifications";
import { listNotifications } from "@/lib/repositories/notifications";
import type { NotificationType } from "@/types";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await requirePageSession("/notifications");
  const notifications = await listNotifications(session.user.id, 50);
  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Notifications"
        description="Replies to your discussions, mentions, activity in discussions you follow, regulatory alerts and challenges."
        actions={<MarkAllReadButton disabled={unread === 0} />}
      />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_17rem]">
        <Panel title={unread ? `${unread} unread` : "All caught up"} bodyClassName="p-0">
          {notifications.length === 0 ? (
            <EmptyState icon="bell" title="No notifications yet" description="Follow discussions, experts and regulators to be notified of new activity." />
          ) : (
            <ul className="divide-y divide-line">
              {notifications.map((n) => {
                const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.reply;
                return (
                  <li key={n.id}>
                    <Link href={n.href} className={clsx("flex gap-3 px-4 py-3 hover:bg-canvas", n.readAt === null && "bg-accent-soft/40")}>
                      <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface", n.type === "regulatory-alert" ? "text-signal" : "text-muted")}>
                        <Icon name={meta.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">{n.title}</span>
                          <span className="text-2xs uppercase tracking-wide text-muted">{meta.label}</span>
                        </span>
                        <span className="block break-words text-sm text-body">{n.body}</span>
                        <RelativeTime iso={n.createdAt} className="text-2xs text-muted" />
                      </span>
                      {n.readAt === null && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Notification types" icon="settings">
          <ul className="space-y-3">
            {(Object.keys(NOTIFICATION_META) as NotificationType[]).map((type) => (
              <li key={type} className="flex gap-2">
                <Icon name={NOTIFICATION_META[type].icon} className="mt-0.5 text-muted" />
                <div>
                  <p className="text-xs font-semibold text-ink">{NOTIFICATION_META[type].label}</p>
                  <p className="text-2xs text-muted">{NOTIFICATION_META[type].description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-2xs text-muted">Per-type delivery preferences (in-app, email digest) are planned for Phase 5.</p>
        </Panel>
      </div>
    </div>
  );
}
