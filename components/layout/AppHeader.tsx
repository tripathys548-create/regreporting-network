"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { PRIMARY_NAV, SECONDARY_NAV, SITE_NAME } from "@/lib/constants";
import type { Notification } from "@/types";
import { useRegBotPanel } from "@/components/regbot/RegBotProvider";
import { Icon } from "@/components/ui/Icon";
import { NotificationBell } from "./NotificationBell";
import { UserMenu, type HeaderViewer } from "./UserMenu";

const REGBOT_HREF = "/regbot";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 text-white" aria-label={`${SITE_NAME} home`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-accent font-mono text-[11px] font-bold tracking-tight">RR</span>
      <span className="hidden text-sm font-semibold tracking-tight sm:inline">
        RegReporting<span className="font-normal text-slate-400"> Network</span>
      </span>
    </Link>
  );
}

function SearchBox({ className, onSubmitted }: { className?: string; onSubmitted?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(pathname === "/search" ? params.get("q") ?? "" : "");

  function submit(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    onSubmitted?.();
  }

  return (
    <form role="search" onSubmit={submit} className={clsx("relative", className)}>
      <label htmlFor={onSubmitted ? "mobile-search" : "global-search"} className="sr-only">
        Search updates, discussions, knowledge and documents
      </label>
      <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        id={onSubmitted ? "mobile-search" : "global-search"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search e.g. UTI lifecycle"
        className="h-8 w-full rounded-md border border-white/10 bg-white/[0.07] pl-8 pr-3 text-xs text-white placeholder:text-slate-400 focus:border-accent focus:bg-white/10 focus:outline-none"
      />
    </form>
  );
}

export function AppHeader({ viewer, notifications }: { viewer: HeaderViewer | null; notifications: Notification[] }) {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const regbot = useRegBotPanel();

  useEffect(() => setMobileOpen(false), [pathname]);

  const desktopItem = (active: boolean) =>
    clsx(
      "relative flex items-center gap-1.5 whitespace-nowrap px-2.5 text-[13px] font-medium transition-colors xl:px-3",
      active ? "text-white after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:bg-accent xl:after:inset-x-3" : "text-slate-400 hover:text-white",
    );
  const mobileItem = (active: boolean) => clsx("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm", active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5");
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <header className="sticky top-0 z-40 border-b border-navy-3 bg-navy">
      <div className="relative mx-auto flex h-12 max-w-shell items-center gap-3 px-4 sm:px-6 xl:gap-4">
        <Logo />

        <nav aria-label="Primary" className="hidden h-full items-stretch lg:flex">
          {PRIMARY_NAV.map((item) =>
            item.href === REGBOT_HREF ? (
              <button key={item.href} type="button" onClick={() => regbot.open()} aria-controls="regbot-panel" aria-expanded={regbot.isOpen} className={desktopItem(regbot.isOpen)}>
                <Icon name="bot" className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ) : (
              <Link key={item.href} href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={desktopItem(isActive(pathname, item.href))}>
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {/* useSearchParams requires a Suspense boundary for statically rendered routes */}
          <Suspense fallback={<div className="hidden h-8 w-56 md:block lg:hidden xl:block xl:w-64 2xl:w-72" />}>
            <SearchBox className="hidden w-56 md:block lg:hidden xl:block xl:w-64 2xl:w-72" />
          </Suspense>
          <Link href="/search" className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white md:hidden lg:flex xl:hidden" aria-label="Search">
            <Icon name="search" />
          </Link>
          {viewer ? (
            <>
              <NotificationBell notifications={notifications} />
              <UserMenu viewer={viewer} />
            </>
          ) : (
            <div className="flex items-center gap-1">
              <Link href={loginHref} className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white">
                Sign in
              </Link>
              <Link href="/signup" className="whitespace-nowrap rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-accent-strong">
                Join
              </Link>
            </div>
          )}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            <Icon name={mobileOpen ? "x" : "menu"} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-navy-3 bg-navy-2 px-4 pb-4 pt-2 lg:hidden">
          <Suspense fallback={null}>
            <SearchBox className="mb-2 md:hidden" onSubmitted={() => setMobileOpen(false)} />
          </Suspense>
          <ul className="grid gap-0.5">
            {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
              <li key={item.href}>
                {item.href === REGBOT_HREF ? (
                  <button
                    type="button"
                    className={mobileItem(false)}
                    onClick={() => {
                      setMobileOpen(false);
                      regbot.open();
                    }}
                  >
                    <Icon name="bot" className="h-4 w-4" />
                    {item.label}
                  </button>
                ) : (
                  <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className={mobileItem(isActive(pathname, item.href))}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
