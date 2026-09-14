import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

export const metadata: Metadata = { title: "Privacy & newsletter consent" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Legal" title="Privacy & newsletter consent" description="How account data and newsletter consent are handled on RegReporting Network." />

      <div className="space-y-6">
        <Panel title="Account data">
          <p className="text-sm leading-relaxed text-body">
            Creating a RegReporting Network account collects your email address, password (stored as a salted hash, never in plain text), and the
            professional details you provide (name, job title, organisation, experience and areas of expertise). This data is used to operate your
            account, verify your email address, and personalise your experience of the platform — including your welcome email, which is sent once,
            automatically, when your account is created.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-body">Creating an account never subscribes you to the newsletter. That is a separate, optional choice — see below.</p>
        </Panel>

        <Panel title="Newsletter consent">
          <p className="text-sm leading-relaxed text-body">
            The RegReporting Network newsletter is opt-in. You can subscribe from the homepage, the footer, or while creating an account — each place
            uses the same explicit, unchecked-by-default checkbox. Subscribing requires confirming a link sent to your email address (double
            opt-in); you are not added to the active mailing list until you confirm.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-body">
            We record when you subscribed, confirmed, and (if applicable) unsubscribed, along with which page you subscribed from. This is used only
            to operate the newsletter and to demonstrate that consent was given, not shared with third parties.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-body">
            Every newsletter email includes a one-click unsubscribe link. Unsubscribing takes effect immediately and stops all further newsletter
            emails; signing back in or updating your profile never resubscribes you — only submitting the subscribe form again does.
          </p>
        </Panel>

        <Panel title="Questions">
          <p className="text-sm leading-relaxed text-body">
            Content on this platform is reference and training material and is not legal or regulatory advice. Always consult the official source. If
            you have questions about your data or would like it removed, contact an administrator through the Community section.
          </p>
        </Panel>
      </div>
    </div>
  );
}
