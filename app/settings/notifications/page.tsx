import type { Metadata } from "next";
import { NotificationPreferencesForm } from "@/components/profile/NotificationPreferencesForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { requirePageSession } from "@/lib/auth/session";
import { getNotificationPreferences } from "@/lib/repositories/notifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notification settings" };

export default async function NotificationSettingsPage() {
  const session = await requirePageSession("/settings/notifications");
  const preferences = await getNotificationPreferences(session.user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notification settings" description="Choose what RegWorld notifies you about, and how." />
      <NotificationPreferencesForm initial={preferences} />
    </div>
  );
}
