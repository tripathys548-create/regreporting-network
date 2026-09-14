import Link from "next/link";
import { RegWorldLogo } from "@/components/brand/RegWorldLogo";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { PRIMARY_NAV, SECONDARY_NAV, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto max-w-shell px-4 pt-8 sm:px-6">
        <NewsletterCTA source="footer" />
      </div>
      <div className="mx-auto grid max-w-shell gap-6 px-4 py-8 text-xs text-muted sm:px-6 md:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <RegWorldLogo className="h-14 w-14" />
            <div>
              <p className="text-sm font-semibold text-ink">{SITE_NAME}</p>
              <p className="mt-0.5 max-w-md">{SITE_TAGLINE}</p>
            </div>
          </div>
          <p className="mt-4 max-w-xl leading-relaxed">
            Regulatory updates come from official publisher feeds and are published after editorial review. Knowledge articles, challenges, timeline milestones
            and RegBot answers are reference material. Nothing on this platform is legal or regulatory advice. Always consult the official source.
          </p>
          <p className="mt-3">
            <Link href="/privacy" className="hover:text-ink">
              Privacy &amp; newsletter consent
            </Link>
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-1.5 self-start">
          {[...PRIMARY_NAV, ...SECONDARY_NAV, { href: "/search", label: "Search" }].map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
