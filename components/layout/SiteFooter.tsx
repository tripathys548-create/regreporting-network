import Link from "next/link";
import { PRIMARY_NAV, SECONDARY_NAV, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { DEMO_SECTIONS_ENABLED } from "@/lib/features";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-shell gap-6 px-4 py-8 text-xs text-muted sm:px-6 md:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="text-sm font-semibold text-ink">{SITE_NAME}</p>
          <p className="mt-1 max-w-md">{SITE_TAGLINE}</p>
          <p className="mt-4 max-w-xl leading-relaxed">
            Regulatory updates come from official publisher feeds and are published after editorial review. Community replies are member interpretation.
            {DEMO_SECTIONS_ENABLED && (
              <>
                {" "}
                Knowledge articles, challenge questions and RegBot answers are <strong className="font-semibold text-signal">Example / Demo Content</strong> and must not be relied upon.
              </>
            )}{" "}
            Nothing on this platform is legal or regulatory advice. Always consult the official source.
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
