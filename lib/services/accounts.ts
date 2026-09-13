import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import type { ProfileUpdateInput, SignupInput } from "@/types";
import type { ServiceResult } from "./community";

function handleBase(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 30)
      .replace(/-+$/, "") || "member"
  );
}

async function uniqueHandle(name: string): Promise<string> {
  const base = handleBase(name);
  if (!(await prisma.profile.findUnique({ where: { handle: base } }))) return base;
  for (let i = 0; i < 5; i++) {
    const candidate = `${base}-${randomBytes(2).toString("hex")}`;
    if (!(await prisma.profile.findUnique({ where: { handle: candidate } }))) return candidate;
  }
  return `${base}-${randomBytes(4).toString("hex")}`;
}

/** New accounts start "pending" until the email address is verified. */
export async function createAccount(input: SignupInput): Promise<ServiceResult<{ userId: string; handle: string }>> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return { ok: false, status: 409, error: "An account with this email already exists. Sign in instead." };

  const handle = await uniqueHandle(input.displayName);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      status: "pending",
      profile: {
        create: {
          handle,
          displayName: input.displayName,
          jobTitle: input.jobTitle,
          organisationName: input.organisationName,
          organisationType: input.organisationType,
          yearsExperience: input.yearsExperience,
          location: input.location,
          expertise: input.expertise,
        },
      },
    },
  });
  return { ok: true, value: { userId: user.id, handle } };
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
  await prisma.profile.update({
    where: { userId },
    data: {
      displayName: input.displayName,
      jobTitle: input.jobTitle,
      organisationName: input.organisationName,
      organisationType: input.organisationType,
      yearsExperience: input.yearsExperience,
      location: input.location,
      bio: input.bio,
      expertise: input.expertise,
    },
  });
}
