import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { securityConfig } from "@/lib/security/config";

export const metadata: Metadata = { title: "Report a security issue" };

/**
 * Public responsible-disclosure page. Deliberately does NOT describe internal
 * security architecture, WAF rules, thresholds, or infrastructure — only what
 * a reporter needs to know to report responsibly.
 */
export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="Trust & Safety" title="Report a security issue" description="RegReporting Network takes the security of member data and the platform seriously. If you believe you have found a vulnerability, please tell us." />

      <Panel title="Report a security concern" bodyClassName="p-5 space-y-3 text-sm text-body">
        <p>
          Email <span className="font-mono text-ink">{securityConfig.securityContactEmail}</span> with a description of the issue. Please do not post
          details publicly or test against other members&rsquo; accounts or data.
        </p>
      </Panel>

      <Panel title="What information to include" bodyClassName="p-5">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-body">
          <li>A clear description of the issue and its potential impact</li>
          <li>Steps to reproduce, including the affected page or endpoint</li>
          <li>Any relevant screenshots (with personal data redacted)</li>
          <li>Whether you have already disclosed this anywhere else</li>
        </ul>
      </Panel>

      <Panel title="What NOT to include" bodyClassName="p-5">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-body">
          <li>Passwords, API keys, session tokens, or other credentials — yours or anyone else&rsquo;s</li>
          <li>Real member data obtained through the vulnerability</li>
          <li>Details of the issue posted to a public forum, social media, or a public GitHub issue before it is resolved</li>
        </ul>
      </Panel>

      <Panel title="Expected response" bodyClassName="p-5 space-y-2 text-sm text-body">
        <p>We aim to acknowledge reports within a few business days and will follow up with next steps or questions. Response times are not guaranteed.</p>
      </Panel>

      <Panel title="Responsible disclosure guidance" bodyClassName="p-5 space-y-2 text-sm text-body">
        <p>
          Please give us reasonable time to investigate and address an issue before disclosing it publicly. Do not access, modify, or delete data that
          isn&rsquo;t yours, and avoid actions that could degrade the service for other members (e.g. load testing, automated scanning against
          production without prior agreement).
        </p>
      </Panel>
    </div>
  );
}
