/**
 * Structured server logging. Every entry is a single JSON line so it can be
 * shipped to any log aggregator without a custom parser.
 *
 * Never pass: passwords, session tokens, API keys, full cookies, full RegBot
 * conversations, or other sensitive personal data. `redact` strips the
 * common cases defensively, but callers are still responsible for not
 * including secrets in `detail`/`fields` in the first place.
 */

const SENSITIVE_KEYS = /password|token|secret|apikey|api_key|authorization|cookie|passwordhash/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export interface LogEntry {
  requestId: string;
  eventType: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  route?: string;
  userId?: string | null;
  action?: string;
  result?: string;
  detail?: unknown;
}

export function logSecurityEvent(entry: LogEntry): void {
  const line = {
    timestamp: new Date().toISOString(),
    ...entry,
    detail: redact(entry.detail),
  };
  // In production this stream is expected to be shipped to the log aggregator
  // configured at the hosting layer (see docs/PRODUCTION_SECURITY_CHECKLIST.md).
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(line));
}
