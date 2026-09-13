const DAY_MS = 86_400_000;

const compactFormatter = new Intl.NumberFormat("en-GB", { notation: "compact", maximumFractionDigits: 1 });

/*
 * Month names are fixed rather than taken from Intl: ICU versions disagree on
 * abbreviations ("Sep" vs "Sept"), which would make server-rendered and
 * hydrated dates differ. All dates render in UTC for the same reason.
 */
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** e.g. "13 Sep 2026" */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** e.g. "13 Sep" */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

/** Whole UTC days from `now` until `iso`. Negative when in the past. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = Date.UTC(new Date(iso).getUTCFullYear(), new Date(iso).getUTCMonth(), new Date(iso).getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / DAY_MS);
}

export function formatCountdown(iso: string, now: Date = new Date()): string {
  const days = daysUntil(iso, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `in ${days} days`;
  return days === -1 ? "Yesterday" : `${Math.abs(days)} days ago`;
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function isWithinDays(iso: string, days: number, now: Date = new Date()): boolean {
  return now.getTime() - new Date(iso).getTime() <= days * DAY_MS;
}

/** YYYY-MM-DD in UTC. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
