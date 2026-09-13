import type { ContentReport, Notification } from "@/types";
import { DEMO_USER_ID } from "./users";

export const NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    userId: DEMO_USER_ID,
    type: "regulatory-alert",
    title: "Regulatory alert: ESMA",
    body: "Updated validation rules for transaction reporting",
    href: "/radar/upd-esma-01",
    createdAt: "2026-09-11T09:00:00Z",
    readAt: null,
  },
  {
    id: "n-2",
    userId: DEMO_USER_ID,
    type: "reply",
    title: "Alex Morgan replied",
    body: "How are firms handling UTI pairing breaks after lifecycle events?",
    href: "/community/uti-pairing-breaks-after-lifecycle-events",
    createdAt: "2026-09-13T07:40:00Z",
    readAt: null,
  },
  {
    id: "n-3",
    userId: DEMO_USER_ID,
    type: "mention",
    title: "Priya Raman mentioned you",
    body: "…@demo-member might have seen this with delegated clients too.",
    href: "/community/managing-delegated-reporting-controls",
    createdAt: "2026-09-12T10:12:00Z",
    readAt: null,
  },
  {
    id: "n-4",
    userId: DEMO_USER_ID,
    type: "followed-discussion",
    title: "New activity in a followed discussion",
    body: "Anyone seeing increased ESMA validation rejects? — 4 new replies",
    href: "/community/increased-esma-validation-rejects",
    createdAt: "2026-09-13T09:05:00Z",
    readAt: null,
  },
  {
    id: "n-5",
    userId: DEMO_USER_ID,
    type: "challenge",
    title: "Today's Daily Challenge is live",
    body: "Keep your streak going with today's question.",
    href: "/challenges",
    createdAt: "2026-09-13T06:00:00Z",
    readAt: "2026-09-13T08:00:00Z",
  },
  {
    id: "n-6",
    userId: DEMO_USER_ID,
    type: "followed-source",
    title: "DTCC published an update",
    body: "GTR technical specification update and UAT window",
    href: "/radar/upd-dtcc-01",
    createdAt: "2026-09-03T12:00:00Z",
    readAt: "2026-09-03T13:00:00Z",
  },
];

export const CONTENT_REPORTS: ContentReport[] = [
  { id: "r-1", targetType: "comment", targetId: "c-3-2", reporterId: "u-4", reason: "confidential-data", detail: "Reply may include a client-identifying UTI.", createdAt: "2026-09-12T09:30:00Z", status: "open" },
  { id: "r-2", targetType: "discussion", targetId: "d-9", reporterId: "u-7", reason: "misleading-regulatory-claim", detail: "Original post states a field is optional without citing a source.", createdAt: "2026-09-11T15:10:00Z", status: "open" },
  { id: "r-3", targetType: "profile", targetId: "u-8", reporterId: "u-1", reason: "spam", detail: "New account posting vendor links.", createdAt: "2026-09-10T18:40:00Z", status: "open" },
  { id: "r-4", targetType: "comment", targetId: "c-1-4", reporterId: "u-3", reason: "off-topic", detail: "Resolved by moderator.", createdAt: "2026-09-10T11:00:00Z", status: "dismissed" },
];
