/*
 * Fixed-window, in-memory rate limiter. Adequate for a single Node process;
 * replace with a shared store (e.g. Redis) when running more than one instance.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_KEYS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
    }
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) return { ok: false, retryAfterSec: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { ok: true };
}
