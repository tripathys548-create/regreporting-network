"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { Avatar } from "@/components/ui/Avatar";
import { Icon, type IconName } from "@/components/ui/Icon";

export interface HeaderViewer {
  handle: string;
  displayName: string;
  initials: string;
  email: string;
  verified: boolean;
  isAdmin: boolean;
}

function MenuLink({ href, icon, children, onSelect }: { href: string; icon: IconName; children: React.ReactNode; onSelect: () => void }) {
  return (
    <li role="none">
      <Link role="menuitem" href={href} onClick={onSelect} className="flex items-center gap-2 px-3 py-2 text-sm text-body hover:bg-canvas hover:text-ink">
        <Icon name={icon} className="text-muted" />
        {children}
      </Link>
    </li>
  );
}

export function UserMenu({ viewer }: { viewer: HeaderViewer }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await api.logout();
    } finally {
      setOpen(false);
      setSigningOut(false);
      router.push("/");
      router.refresh();
    }
  }

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${viewer.displayName}`}
        className="relative flex items-center rounded-md p-1 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <Avatar initials={viewer.initials} size="sm" className="bg-accent" />
        {!viewer.verified && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-navy" aria-hidden />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-lg">
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
            <p className="truncate text-2xs text-muted">{viewer.email}</p>
            {!viewer.verified && <p className="mt-1 text-2xs font-medium text-signal">Email not yet verified</p>}
          </div>
          <ul className="py-1" role="none">
            <MenuLink href={`/members/${viewer.handle}`} icon="user" onSelect={close}>
              Your profile
            </MenuLink>
            <MenuLink href="/settings/profile" icon="settings" onSelect={close}>
              Edit profile
            </MenuLink>
            <MenuLink href="/notifications" icon="bell" onSelect={close}>
              Notifications
            </MenuLink>
            <MenuLink href="/suggest" icon="flag" onSelect={close}>
              Suggest an improvement
            </MenuLink>
            {!viewer.verified && (
              <MenuLink href="/verify-email" icon="mail" onSelect={close}>
                Verify email
              </MenuLink>
            )}
            {viewer.isAdmin && (
              <MenuLink href="/admin" icon="shield" onSelect={close}>
                Admin
              </MenuLink>
            )}
          </ul>
          <div className="border-t border-line py-1">
            <button type="button" role="menuitem" onClick={signOut} disabled={signingOut} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-body hover:bg-canvas hover:text-ink disabled:opacity-60">
              <Icon name="logOut" className="text-muted" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
