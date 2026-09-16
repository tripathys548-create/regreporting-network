import type { IconName } from "@/components/ui/Icon";
import type { NotificationCategory, NotificationType } from "@/types";

export const NOTIFICATION_META: Record<NotificationType, { icon: IconName; label: string; description: string }> = {
  reply: { icon: "message", label: "Replies", description: "Someone replies to your discussion or answer." },
  mention: { icon: "user", label: "Mentions", description: "A member mentions you by handle." },
  "followed-discussion": { icon: "bookmark", label: "Followed discussions", description: "New activity on discussions you follow." },
  "regulatory-alert": { icon: "alert", label: "Regulatory alerts", description: "Critical updates promoted to the alert banner." },
  challenge: { icon: "trophy", label: "Challenges", description: "The daily challenge and new challenge sets." },
  "followed-source": { icon: "radar", label: "Followed regulators", description: "New updates from sources you follow." },
  "followed-topic": { icon: "bookmark", label: "Followed topics", description: "New discussions in topics you follow." },
  suggestion: { icon: "flag", label: "Suggestions", description: "Admin-only: a member submitted a suggestion." },
  "admin-announcement": { icon: "info", label: "Announcements", description: "Site-wide announcements from the RegWorld team." },
};

/** Groups notification types for the /notifications filter tabs and /settings/notifications sections. */
export const NOTIFICATION_CATEGORY: Record<NotificationType, NotificationCategory> = {
  reply: "community",
  mention: "community",
  "followed-discussion": "community",
  "followed-topic": "community",
  "regulatory-alert": "regulatory",
  "followed-source": "regulatory",
  challenge: "system",
  suggestion: "system",
  "admin-announcement": "system",
};

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  regulatory: "Regulatory",
  community: "Community",
  system: "System",
};
