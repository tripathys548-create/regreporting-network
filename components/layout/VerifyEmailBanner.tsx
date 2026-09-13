"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function VerifyEmailBanner() {
  const pathname = usePathname();
  if (pathname === "/verify-email") return null;
  return (
    <div className="border-b border-signal/25 bg-signal-soft" role="status">
      <div className="mx-auto flex max-w-shell flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs text-signal sm:px-6">
        <Icon name="mail" className="h-3.5 w-3.5" />
        <span>Verify your email address to post, reply and vote.</span>
        <Link href={`/verify-email?next=${encodeURIComponent(pathname ?? "/")}`} className="font-semibold underline underline-offset-2 hover:text-ink">
          Enter verification code
        </Link>
      </div>
    </div>
  );
}
