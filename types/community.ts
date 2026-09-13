import type { ContentStatus, ID, ISODateString, TopicSlug } from "./common";
import type { ProfileSummary } from "./user";

/** What the current visitor may do: read only, act but not publish, or fully participate. */
export type ViewerStatus = "signed-out" | "unverified" | "member";

/** The signed-in member's relationship to a discussion or reply. */
export interface ViewerState {
  upvoted: boolean;
  saved: boolean;
  following: boolean;
}

export interface DiscussionView extends Discussion {
  author: ProfileSummary | null;
  experts: ProfileSummary[];
}

export interface CommentView extends Comment {
  author: ProfileSummary | null;
  viewerUpvoted: boolean;
}

export interface NewCommentInput {
  body: string;
  parentId: ID | null;
}

export type VoteTarget = "discussion" | "comment";

export type DiscussionOrigin = "member" | "regbot-escalation";

export interface Discussion {
  id: ID;
  slug: string;
  title: string;
  body: string;
  authorId: ID;
  category: TopicSlug;
  tags: string[];
  createdAt: ISODateString;
  lastActivityAt: ISODateString;
  replyCount: number;
  viewCount: number;
  voteScore: number;
  /** Profiles with verified expertise in the category who have replied. */
  expertParticipantIds: ID[];
  acceptedCommentId: ID | null;
  status: ContentStatus;
  origin: DiscussionOrigin;
  /** Set when the discussion was escalated from a RegBot session. */
  linkedChatSessionId: ID | null;
}

export interface Comment {
  id: ID;
  discussionId: ID;
  parentId: ID | null;
  authorId: ID;
  body: string;
  createdAt: ISODateString;
  voteScore: number;
  isAccepted: boolean;
  /** Flagged by moderators as a candidate for promotion into the Knowledge Base. */
  knowledgeBaseCandidate: boolean;
  status: ContentStatus;
}

export type VoteValue = 1 | -1;

export interface DiscussionVote {
  userId: ID;
  discussionId: ID;
  commentId: ID | null;
  value: VoteValue;
  createdAt: ISODateString;
}

export interface NewDiscussionInput {
  title: string;
  body: string;
  category: TopicSlug;
  tags: string[];
  linkedChatSessionId?: ID | null;
}

export type ReportReason = "misleading-regulatory-claim" | "spam" | "confidential-data" | "abuse" | "off-topic";

export interface ContentReport {
  id: ID;
  targetType: "discussion" | "comment" | "profile";
  targetId: ID;
  reporterId: ID;
  reason: ReportReason;
  detail: string;
  createdAt: ISODateString;
  status: "open" | "actioned" | "dismissed";
}
