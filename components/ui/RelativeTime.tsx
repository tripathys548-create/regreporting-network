import { formatDate, formatRelative } from "@/lib/format";

/** Relative timestamps can differ by a bucket between server render and hydration; that is expected. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  return (
    <time dateTime={iso} title={formatDate(iso)} className={className} suppressHydrationWarning>
      {formatRelative(iso)}
    </time>
  );
}
