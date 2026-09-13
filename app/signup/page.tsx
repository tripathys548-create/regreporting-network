import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/Field";
import { SignupForm } from "@/components/auth/SignupForm";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Join" };

const WHY: { icon: IconName; title: string; body: string }[] = [
  { icon: "users", title: "A practitioner network", body: "Your organisation, role and experience help members judge the context behind an answer." },
  { icon: "shieldCheck", title: "Verified before posting", body: "Email verification is required to post, reply or vote. Moderators can additionally verify practitioner status." },
  { icon: "lock", title: "Your details", body: "Your email is never shown publicly. Name, role, organisation and experience appear on your profile." },
];

export default async function SignupPage() {
  if (await getSession()) redirect("/");

  return (
    <AuthShell
      title="Join RegReporting Network"
      description="Create your professional profile. All fields except location and expertise are required."
      aside={
        <Panel title="Why we ask for these details" icon="info">
          <ul className="space-y-3">
            {WHY.map((item) => (
              <li key={item.title} className="flex gap-2.5">
                <Icon name={item.icon} className="mt-0.5 text-accent" />
                <div>
                  <p className="text-xs font-semibold text-ink">{item.title}</p>
                  <p className="text-xs text-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
