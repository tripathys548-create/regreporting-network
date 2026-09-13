import type { ReactNode } from "react";
import { RegWorldLogo } from "@/components/brand/RegWorldLogo";

/** Label + control + hint/error, wired for screen readers via `${id}-help`. */
export function Field({ id, label, error, hint, optional, children, className }: { id: string; label: string; error?: string; hint?: string; optional?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-help`} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-help`} className="mt-1 text-2xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthShell({ title, description, children, aside }: { title: string; description?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className={aside ? "mx-auto grid max-w-5xl gap-6 py-2 lg:grid-cols-[1fr_20rem]" : "mx-auto max-w-md py-6"}>
      <div className="min-w-0 rounded-md border border-line bg-surface p-5 sm:p-7">
        <RegWorldLogo className="mb-4 h-16 w-16" />
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-body">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {aside && <aside className="min-w-0 space-y-4">{aside}</aside>}
    </div>
  );
}
