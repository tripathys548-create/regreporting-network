import clsx from "clsx";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function EmptyState({ icon = "layers", title, description, action, className }: { icon?: IconName; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-canvas text-muted">
        <Icon name={icon} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }: { title?: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={clsx("flex items-start gap-3 rounded-md border border-bad/25 bg-bad-soft px-4 py-3", className)}>
      <Icon name="alert" className="mt-0.5 text-bad" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-bad">{title}</p>
        {description && <p className="mt-0.5 text-sm text-body">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded bg-ink/[0.06]", className)} />;
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-md border border-line bg-surface" aria-busy="true" aria-label="Loading">
      <div className="border-b border-line px-4 py-3">
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="space-y-4 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
