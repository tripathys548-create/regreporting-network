import type { ID, ISODateString } from "./common";

export type NotificationType =
  | "reply"
  | "mention"
  | "followed-discussion"
  | "regulatory-alert"
  | "challenge"
  | "followed-source";

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
