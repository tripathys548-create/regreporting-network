import type { IconName } from "@/components/ui/Icon";
import type { NotificationType } from "@/types";

export const NOTIFICATION_META: Record<NotificationType, { icon: IconName; label: string; description: string }> = {
  reply: { icon: "message", label: "Replies", description: "Someone replies to your discussion or answer." },
  mention: { icon: "user", label: "Mentions", description: "A member mentions you by handle." },
  "followed-discussion": { icon: "bookmark", label: "Followed discussions", description: "New activity on discussions you follow." },
  "regulatory-alert": { icon: "alert", label: "Regulatory alerts", description: "Critical updates promoted to the alert banner." },
  challenge: { icon: "trophy", label: "Challenges", description: "The daily challenge and new challenge sets." },
  "followed-source": { icon: "radar", label: "Followed regulators", description: "New updates from sources you follow." },
};
