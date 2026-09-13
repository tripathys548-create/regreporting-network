import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface PanelProps {
  title?: ReactNode;
  eyebrow?: string;
  icon?: IconName;
  action?: { href: string; label: string };
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  as?: "section" | "div" | "article";
  id?: string;
}

/** Bordered content region with an optional terminal-style header bar. */
export function Panel({ title, eyebrow, icon, action, headerRight, children, className, bodyClassName, as: Tag = "section", id }: PanelProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    // min-w-0: panels are usually grid items; without it wide children (tables, chip rows) stretch the column past the viewport.
    <Tag id={id} aria-labelledby={title ? headingId : undefined} className={clsx("min-w-0 rounded-md border border-line bg-surface", className)}>
      {(title || action || headerRight) && (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <Icon name={icon} className="text-muted" />}
            <div className="min-w-0">
              {eyebrow && <p className="text-2xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>}
              {title && (
                <h2 id={headingId} className="truncate text-sm font-semibold text-ink">
                  {title}
                </h2>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {headerRight}
            {action && (
              <Link href={action.href} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-strong">
                {action.label}
                <Icon name="chevronRight" className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </header>
      )}
      <div className={clsx(bodyClassName ?? "p-4")}>{children}</div>
    </Tag>
  );
}
