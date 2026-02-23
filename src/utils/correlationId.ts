/**
 * Session-scoped correlation ID for request tracing (THR-003).
 * Generated once per browser session using crypto.randomUUID().
 */
const SESSION_CORRELATION_ID: string = crypto.randomUUID();

export function getCorrelationId(): string {
  return SESSION_CORRELATION_ID;
}
