import clsx from "clsx";

const SIZES = { xs: "h-5 w-5 text-[9px]", sm: "h-7 w-7 text-2xs", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-base" } as const;

/** Initials only — no profile photos, keeping focus on expertise rather than persona. */
export function Avatar({ initials, size = "sm", className, verified }: { initials: string; size?: keyof typeof SIZES; className?: string; verified?: boolean }) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-navy-3 font-semibold tracking-wide text-white",
        verified && "ring-2 ring-accent/40 ring-offset-1 ring-offset-surface",
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ people, max = 3 }: { people: { initials: string; displayName: string }[]; max?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex items-center" title={people.map((p) => p.displayName).join(", ")}>
      {shown.map((p, i) => (
        <Avatar key={p.displayName} initials={p.initials} size="xs" className={clsx("ring-2 ring-surface", i > 0 && "-ml-1.5")} />
      ))}
      {extra > 0 && <span className="ml-1 text-2xs text-muted">+{extra}</span>}
      <span className="sr-only">{people.map((p) => p.displayName).join(", ")}</span>
    </span>
  );
}
