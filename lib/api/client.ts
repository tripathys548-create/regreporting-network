import type { FollowTargetType, NewCommentInput, NewDiscussionInput, RegBotResponse, RegulatoryAlert, ReportReason, SearchResponse, VoteTarget } from "@/types";

/*
 * Browser-side API client. Components never call fetch directly, so the
 * transport and error handling change in one place.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError("Network error — check your connection and try again.", 0);
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string; errors?: unknown; code?: string }) | null;
  if (!res.ok || body === null) {
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status, body?.errors, body?.code);
  }
  return body;
}

const post = <T>(path: string, body: unknown = {}) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

/** Sends the visitor to sign in and back to the current page. */
export function goToSignIn(): void {
  window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
}

export const api = {
  askRegBot: (question: string, sessionId: string | null) => post<RegBotResponse>("/api/regbot", { question, sessionId }),
  getActiveAlert: () => request<{ alert: RegulatoryAlert | null }>("/api/alerts"),
  search: (params: URLSearchParams) => request<SearchResponse>(`/api/search?${params.toString()}`),

  signup: (input: Record<string, unknown>) => post<{ redirect: string }>("/api/auth/signup", input),
  login: (input: { email: string; password: string; next: string }) => post<{ redirect: string }>("/api/auth/login", input),
  logout: () => post<{ ok: true }>("/api/auth/logout"),
  verifyEmail: (code: string) => post<{ ok: true }>("/api/auth/verify", { code }),
  resendVerification: () => post<{ ok: true }>("/api/auth/resend"),
  updateProfile: (input: Record<string, unknown>) => request<{ ok: true }>("/api/profile", { method: "PATCH", body: JSON.stringify(input) }),

  createDiscussion: (input: NewDiscussionInput) => post<{ slug: string }>("/api/discussions", input),
  createComment: (discussionId: string, input: NewCommentInput) => post<{ id: string }>(`/api/discussions/${discussionId}/comments`, input),
  toggleVote: (target: VoteTarget, id: string) => post<{ upvoted: boolean; voteScore: number }>("/api/votes", { target, id }),
  toggleSave: (discussionId: string) => post<{ saved: boolean }>("/api/saves", { discussionId }),
  toggleFollow: (targetType: FollowTargetType, targetId: string) => post<{ following: boolean }>("/api/follows", { targetType, targetId }),
  toggleAccept: (commentId: string) => post<{ accepted: boolean }>(`/api/comments/${commentId}/accept`),
  report: (input: { targetType: "discussion" | "comment" | "profile"; targetId: string; reason: ReportReason; detail: string }) =>
    post<{ alreadyReported: boolean }>("/api/reports", input),
  markNotificationsRead: (ids?: string[]) => post<{ updated: number }>("/api/notifications/read", { ids }),
};
