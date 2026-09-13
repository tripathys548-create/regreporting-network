import type { ID, ISODateString, TopicSlug } from "./common";

export type UserRole = "member" | "moderator" | "admin";

/** "pending" = registered but not yet email-verified / approved; cannot publish. */
export type AccountStatus = "pending" | "active" | "suspended";

export interface User {
  id: ID;
  email: string;
  emailVerifiedAt: ISODateString | null;
  role: UserRole;
  status: AccountStatus;
  createdAt: ISODateString;
}

export type OrganisationType =
  | "Sell-side bank"
  | "Buy-side firm"
  | "Trade repository"
  | "Consultancy"
  | "Technology vendor"
  | "Regulator"
  | "Corporate"
  | "Other";

export interface ProfileStats {
  contributions: number;
  helpfulAnswers: number;
  reputation: number;
  followers: number;
}

/** Expertise-first professional profile. No vanity metrics beyond contribution quality. */
export interface Profile {
  userId: ID;
  handle: string;
  displayName: string;
  initials: string;
  jobTitle: string;
  organisationName: string;
  organisationType: OrganisationType;
  yearsExperience: number;
  expertise: TopicSlug[];
  location: string;
  bio: string;
  /** Set by moderators after practitioner verification (e.g. work email + review). */
  verifiedPractitioner: boolean;
  stats: ProfileStats;
  joinedAt: ISODateString;
}

/** Minimal author card used in lists and threads. */
export type ProfileSummary = Pick<Profile, "userId" | "handle" | "displayName" | "initials" | "jobTitle" | "verifiedPractitioner" | "yearsExperience">;

export interface SignupInput {
  displayName: string;
  email: string;
  password: string;
  jobTitle: string;
  organisationName: string;
  organisationType: OrganisationType;
  yearsExperience: number;
  location: string;
  expertise: TopicSlug[];
}

export type ProfileUpdateInput = Omit<SignupInput, "email" | "password"> & { bio: string };

export type FollowTargetType = "user" | "discussion" | "source" | "topic";

export interface UserFollow {
  followerId: ID;
  targetType: FollowTargetType;
  targetId: ID;
  createdAt: ISODateString;
}
