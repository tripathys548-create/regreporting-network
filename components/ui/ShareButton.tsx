"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { ShareContentType, ShareMethod } from "@/lib/repositories/shareEvents";
import { Icon } from "./Icon";
import { buttonClasses } from "./Button";

interface ShareButtonProps {
  url: string;
  title: string;
  text: string;
  contentType: ShareContentType;
  contentId: string;
  className?: string;
}

function record(contentType: ShareContentType, contentId: string, method: ShareMethod) {
  api.recordShare({ contentType, contentId, method }).catch(() => {
    // Non-critical: never block the share action on telemetry.
  });
}

/**
 * Reusable share control (spec §19-22): Copy Link, WhatsApp, LinkedIn, Email, X, and —
 * on devices that support it — the native Web Share sheet instead of the menu.
 * Always shares the content's own stable deep link, never the homepage.
 */
export function ShareButton({ url, title, text, contentType, contentId, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
      record(contentType, contentId, "native-share");
    } catch {
      // User cancelled the native share sheet — not an error.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      record(contentType, contentId, "copy-link");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — no-op; the link is still visible/selectable via the menu items below.
    }
  }

  function openShareLink(method: Exclude<ShareMethod, "copy-link" | "native-share">, href: string) {
    record(contentType, contentId, method);
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  const whatsappText = `${title}\n\n${text}\n\nJoin the discussion: ${url}`;
  const links: { method: Exclude<ShareMethod, "copy-link" | "native-share">; label: string; href: string }[] = [
    { method: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(whatsappText)}` },
    { method: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { method: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
    { method: "email", label: "Email", href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}` },
  ];

  if (canNativeShare) {
    return (
      <button type="button" onClick={nativeShare} className={clsx(buttonClasses("secondary", "sm"), className)}>
        <Icon name="share" />
        Share
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true" className={clsx(buttonClasses("secondary", "sm"), className)}>
        <Icon name="share" />
        Share
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md border border-line bg-surface text-ink shadow-lg">
          <button type="button" onClick={copyLink} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-canvas">
            <Icon name={copied ? "check" : "copy"} className={copied ? "text-good" : "text-muted"} />
            {copied ? "Link copied" : "Copy link"}
          </button>
          {links.map((l) => (
            <button key={l.method} type="button" onClick={() => openShareLink(l.method, l.href)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-canvas">
              <Icon name="external" className="text-muted" />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
