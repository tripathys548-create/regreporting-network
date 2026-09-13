/**
 * Tracks failed-login volume per source IP (across however many distinct
 * accounts it targets) so a credential-stuffing burst produces one
 * MULTIPLE_LOGIN_FAILURES security event instead of being invisible until
 * someone notices a pile of 401s in the logs.
 *
 * In-memory, single-process — same caveat as lib/rateLimit.ts.
 */
import { securityConfig } from "./config";
import { recordSecurityEvent } from "./events";
import { escalate } from "./restrictions";

interface FailureWindow {
  count: number;
  accounts: Set<string>;
  windowStart: number;
  alerted: boolean;
}

const failuresByIp = new Map<string, FailureWindow>();

export async function recordLoginFailure(requestId: string, ip: string, emailAttempted: string): Promise<void> {
  const now = Date.now();
  const windowMs = securityConfig.thresholds.loginFailureWindowMs;
  let w = failuresByIp.get(ip);

  if (!w || now - w.windowStart > windowMs) {
    w = { count: 0, accounts: new Set(), windowStart: now, alerted: false };
    failuresByIp.set(ip, w);
  }

  w.count += 1;
  w.accounts.add(emailAttempted);

  if (w.count >= securityConfig.thresholds.loginFailuresPerWindow && !w.alerted) {
    w.alerted = true;
    const minutes = Math.round((now - w.windowStart) / 60000) || 1;
    await recordSecurityEvent({
      requestId,
      eventType: "MULTIPLE_LOGIN_FAILURES",
      ip,
      detail: `${w.count} failed attempts across ${w.accounts.size} account(s) in ${minutes} minute(s)`,
    });
    await escalate("source", ip, "rate-limited", "Multiple login failures");
  }
}

export function resetLoginFailures(ip: string): void {
  failuresByIp.delete(ip);
}
