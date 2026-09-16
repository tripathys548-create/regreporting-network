import type { ID, ISODateString } from "./common";

export type NotificationType =
  | "reply"
  | "mention"
  | "followed-discussion"
  | "regulatory-alert"
  | "challenge"
  | "followed-source"
  | "followed-topic"
  | "suggestion"
  | "admin-announcement";

export type NotificationCategory = "regulatory" | "community" | "system";

export interface NotificationPreferences {
  replies: boolean;
  mentions: boolean;
  followedDiscussions: boolean;
  followedTopics: boolean;
  regulatoryUpdates: boolean;
  knowledgeArticles: boolean;
  challenges: boolean;
  adminAnnouncements: boolean;
  emailDigest: boolean;
}

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  createdAt: ISODateString;
  readAt: ISODateString | null;
}
