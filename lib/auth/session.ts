import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { toProfile, toUser } from "@/lib/repositories/mappers";
import type { Profile, User, ViewerStatus } from "@/types";
import { generateSessionToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "rrn_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface Session {
  user: User;
  profile: Profile;
}

/** Current signed-in member, or null. Deduplicated per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { profile: true } } },
  });
  if (!row || row.expiresAt < new Date() || !row.user.profile || row.user.status === "suspended") return null;

  return { user: toUser(row.user), profile: toProfile(row.user.profile) };
});

/** Creates a session and sets the cookie. Call from a Route Handler. */
export async function startSession(userId: string): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  cookies().delete(SESSION_COOKIE);
}

/** Only verified, active members may publish or vote. */
export function canPublish(user: User): boolean {
  return user.status === "active" && user.emailVerifiedAt !== null;
}

export function getViewerStatus(session: Session | null): ViewerStatus {
  if (!session) return "signed-out";
  return canPublish(session.user) ? "member" : "unverified";
}

/** For pages: redirect signed-out visitors to sign in, then back to `returnTo`. */
export async function requirePageSession(returnTo: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return session;
}

type ApiAuth = { ok: true; session: Session } | { ok: false; response: NextResponse };

/** For Route Handlers: enforce sign-in, and optionally email verification or admin role. */
export function isStaff(user: User): boolean {
  return user.role === "admin" || user.role === "moderator";
}

export async function authorizeApi(options: { verified?: boolean; admin?: boolean; staff?: boolean } = {}): Promise<ApiAuth> {
  const session = await getSession();
  if (!session) return { ok: false, response: NextResponse.json({ error: "Sign in to continue.", code: "unauthenticated" }, { status: 401 }) };
  if (options.verified && !canPublish(session.user)) {
    return { ok: false, response: NextResponse.json({ error: "Verify your email address to do this.", code: "unverified" }, { status: 403 }) };
  }
  if (options.staff && !isStaff(session.user)) {
    return { ok: false, response: NextResponse.json({ error: "Moderator access required.", code: "forbidden" }, { status: 403 }) };
  }
  if (options.admin && session.user.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Admin access required.", code: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, session };
}
