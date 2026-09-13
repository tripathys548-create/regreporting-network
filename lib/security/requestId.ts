/** Short, URL-safe request ID: rw-8f31c9a2. Attach to logs, security events, and error responses. */
export function newRequestId(): string {
  return `rw-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

export function requestIdFromHeaders(headers: Headers): string {
  return headers.get("x-request-id") || newRequestId();
}
