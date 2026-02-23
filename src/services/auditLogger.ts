import type { AuditAction, AuditEvent } from '@/types/audit';
import { getCorrelationId } from '@/utils/correlationId';

const BATCH_INTERVAL_MS = 5000;
const AUDIT_ENDPOINT = import.meta.env['VITE_AUDIT_ENDPOINT'] as string | undefined;

let currentUserId: string | null = null;
let sessionId: string = crypto.randomUUID();
const eventQueue: AuditEvent[] = [];
let batchTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Hash email with SHA-256 to mask PII before logging.
 * OWASP A09 - never log raw email addresses.
 */
async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(email.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildEvent(
  action: AuditAction,
  target: string | null,
  metadata: Record<string, unknown>
): AuditEvent {
  return {
    timestamp: new Date().toISOString(),
    sessionId,
    userId: currentUserId,
    action,
    target,
    metadata,
    correlationId: getCorrelationId(),
  };
}

function sendBatch(events: AuditEvent[]): void {
  if (!AUDIT_ENDPOINT || events.length === 0) return;

  const payload = JSON.stringify({ events });

  // Fire-and-forget: failures must not block user interaction
  fetch(AUDIT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Intentionally suppress errors - audit failures are non-blocking
  });
}

function flushQueue(): void {
  if (eventQueue.length === 0) return;
  const events = eventQueue.splice(0, eventQueue.length);
  sendBatch(events);
}

function sendBeaconFlush(): void {
  if (!AUDIT_ENDPOINT || eventQueue.length === 0) return;

  const events = eventQueue.splice(0, eventQueue.length);
  const payload = JSON.stringify({ events });

  // Use sendBeacon for reliability on page unload
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(AUDIT_ENDPOINT, blob);
  } else {
    sendBatch(events);
  }
}

function startBatchTimer(): void {
  if (batchTimer !== null) return;
  batchTimer = setInterval(flushQueue, BATCH_INTERVAL_MS);
}

// Initialize batch timer and unload handlers
startBatchTimer();
window.addEventListener('beforeunload', sendBeaconFlush);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    sendBeaconFlush();
  }
});

export const auditLogger = {
  setUser(userId: string | null): void {
    currentUserId = userId;
  },

  resetSession(): void {
    sessionId = crypto.randomUUID();
    currentUserId = null;
  },

  async logLogin(email: string): Promise<void> {
    const hashedEmail = await hashEmail(email);
    eventQueue.push(buildEvent('login', null, { emailHash: hashedEmail }));
  },

  async logLoginFailed(email: string): Promise<void> {
    const hashedEmail = await hashEmail(email);
    eventQueue.push(buildEvent('login_failed', null, { emailHash: hashedEmail }));
  },

  logLogout(): void {
    eventQueue.push(buildEvent('logout', null, {}));
  },

  logReviewSubmitted(movieId: string): void {
    eventQueue.push(buildEvent('review_submitted', movieId, {}));
  },

  logAdminPageAccess(page: string): void {
    eventQueue.push(buildEvent('admin_page_access', page, {}));
  },

  logUnauthorizedAccess(attemptedPath: string): void {
    eventQueue.push(buildEvent('unauthorized_access_attempt', attemptedPath, {}));
  },

  logTokenRefresh(): void {
    eventQueue.push(buildEvent('token_refresh', null, {}));
  },

  logSearch(term: string): void {
    // Log term length only to minimize PII exposure
    eventQueue.push(buildEvent('search_performed', null, { termLength: term.length }));
  },

  flush: flushQueue,

  // Exposed for testing only
  _getQueue(): AuditEvent[] {
    return eventQueue;
  },

  _resetForTest(): void {
    eventQueue.splice(0, eventQueue.length);
    currentUserId = null;
    sessionId = crypto.randomUUID();
  },
};
