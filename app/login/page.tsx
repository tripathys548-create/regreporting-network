import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/Field";
import { LoginForm } from "@/components/auth/LoginForm";
import { safeNext } from "@/lib/auth/redirects";
import { getSession } from "@/lib/auth/session";
import { firstParam, type SearchParams } from "@/lib/params";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const next = safeNext(firstParam(searchParams, "next"));
  if (await getSession()) redirect(next);

  return (
    <AuthShell title="Sign in" description="Welcome back. Sign in to post, reply, vote and follow experts.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
