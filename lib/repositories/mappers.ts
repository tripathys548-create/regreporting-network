import type {
  Comment as CommentRow,
  ContentReport as ReportRow,
  Discussion as DiscussionRow,
  Notification as NotificationRow,
  Profile as ProfileRow,
  RegulatoryUpdate as UpdateRow,
  User as UserRow,
} from "@prisma/client";
import { isTopicSlug } from "@/data/topics";
import { ORGANISATION_TYPES } from "@/lib/constants";
import type {
  AccountStatus,
  Comment,
  ContentReport,
  ContentStatus,
  Discussion,
  DiscussionOrigin,
  Jurisdiction,
  Notification,
  NotificationType,
  OrganisationType,
  Profile,
  ProfileStats,
  ProfileSummary,
  RegulatoryUpdate,
  ReportReason,
  TopicSlug,
  UpdateSeverity,
  User,
  UserRole,
} from "@/types";

/* Converts Prisma rows (Dates, raw strings) into the domain types used by the UI. */

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

const iso = (d: Date) => d.toISOString();
const topicOr = (value: string, fallback: TopicSlug = "operations"): TopicSlug => (isTopicSlug(value) ? value : fallback);

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.emailVerifiedAt ? iso(row.emailVerifiedAt) : null,
    role: row.role as UserRole,
    status: row.status as AccountStatus,
    createdAt: iso(row.createdAt),
  };
}

export const EMPTY_STATS: ProfileStats = { contributions: 0, helpfulAnswers: 0, reputation: 0, followers: 0 };

export function toProfile(row: ProfileRow, stats: ProfileStats = EMPTY_STATS): Profile {
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    initials: initialsFor(row.displayName),
    jobTitle: row.jobTitle,
    organisationName: row.organisationName,
    organisationType: (ORGANISATION_TYPES as readonly string[]).includes(row.organisationType) ? (row.organisationType as OrganisationType) : "Other",
    yearsExperience: row.yearsExperience,
    expertise: row.expertise.filter(isTopicSlug),
    location: row.location,
    bio: row.bio,
    verifiedPractitioner: row.verifiedPractitioner,
    stats,
    joinedAt: iso(row.createdAt),
  };
}

export function toProfileSummary(row: ProfileRow): ProfileSummary {
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    initials: initialsFor(row.displayName),
    jobTitle: row.jobTitle,
    verifiedPractitioner: row.verifiedPractitioner,
    yearsExperience: row.yearsExperience,
  };
}

export function toDiscussion(row: DiscussionRow, expertParticipantIds: string[] = []): Discussion {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    authorId: row.authorId,
    category: topicOr(row.category),
    tags: row.tags,
    createdAt: iso(row.createdAt),
    lastActivityAt: iso(row.lastActivityAt),
    replyCount: row.replyCount,
    viewCount: row.viewCount,
    voteScore: row.voteScore,
    expertParticipantIds,
    acceptedCommentId: row.acceptedCommentId,
    status: row.status as ContentStatus,
    origin: row.origin as DiscussionOrigin,
    linkedChatSessionId: null,
  };
}

export function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    discussionId: row.discussionId,
    parentId: row.parentId,
    authorId: row.authorId,
    body: row.body,
    createdAt: iso(row.createdAt),
    voteScore: row.voteScore,
    isAccepted: row.isAccepted,
    knowledgeBaseCandidate: row.knowledgeBaseCandidate,
    status: row.status as ContentStatus,
  };
}

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    href: row.href,
    createdAt: iso(row.createdAt),
    readAt: row.readAt ? iso(row.readAt) : null,
  };
}

export function toContentReport(row: ReportRow): ContentReport {
  return {
    id: row.id,
    targetType: row.targetType as ContentReport["targetType"],
    targetId: row.targetId,
    reporterId: row.reporterId,
    reason: row.reason as ReportReason,
    detail: row.detail,
    createdAt: iso(row.createdAt),
    status: row.status as ContentReport["status"],
  };
}

export function toRegulatoryUpdate(row: UpdateRow): RegulatoryUpdate {
  return {
    id: row.id,
    sourceId: row.sourceId,
    title: row.title,
    summary: row.summary,
    category: topicOr(row.category, "regulatory-change"),
    topics: row.topics.filter(isTopicSlug),
    jurisdiction: row.jurisdiction as Jurisdiction,
    publishedAt: iso(row.publishedAt),
    originalUrl: row.originalUrl,
    severity: row.severity as UpdateSeverity,
    isAlert: row.isAlert,
    status: row.status as ContentStatus,
    isDemo: row.isDemo,
  };
}
