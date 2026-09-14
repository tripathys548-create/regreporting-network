import { Icon } from "@/components/ui/Icon";
import { NewsletterSignupForm, type NewsletterConsentSource } from "./NewsletterSignupForm";

const VALUE_POINTS = [
  "Important regulatory developments",
  "Reporting changes worth knowing",
  "Upcoming implementation dates",
  "Practical reporting insights",
  "Useful knowledge-base resources",
  "A weekly regulatory challenge",
];

/** The one reusable newsletter CTA block — homepage, footer, Radar, Knowledge Base, Challenges. Not a popup. */
export function NewsletterCTA({ source, className = "" }: { source: NewsletterConsentSource; className?: string }) {
  return (
    <div className={`rounded-md border border-line bg-surface p-5 ${className}`}>
      <p className="flex items-center gap-1.5 font-mono text-2xs font-semibold uppercase tracking-widest text-accent">
        <Icon name="mail" className="h-3.5 w-3.5" /> The RegReporting Weekly
      </p>
      <p className="mt-1.5 text-sm font-semibold text-ink">A concise briefing for regulatory-reporting professionals.</p>
      <ul className="mt-2 grid gap-1 text-xs text-body sm:grid-cols-2">
        {VALUE_POINTS.map((point) => (
          <li key={point} className="flex items-start gap-1.5">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-muted" />
            {point}
          </li>
        ))}
      </ul>
      <div className="mt-4 max-w-md">
        <NewsletterSignupForm source={source} />
      </div>
    </div>
  );
}
