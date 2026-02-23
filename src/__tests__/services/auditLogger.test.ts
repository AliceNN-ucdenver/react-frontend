import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the auditLogger module in isolation
describe('auditLogger', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_AUDIT_ENDPOINT', 'http://localhost:8080/api/audit/events');
  });

  it('builds events with required fields', async () => {
    const { auditLogger } = await import('@/services/auditLogger');
    auditLogger._resetForTest();

    auditLogger.logLogout();
    const queue = auditLogger._getQueue();

    expect(queue).toHaveLength(1);
    const event = queue[0];
    expect(event).toBeDefined();
    if (event) {
      expect(event.timestamp).toBeTruthy();
      expect(event.action).toBe('logout');
      expect(event.correlationId).toBeTruthy();
      expect(event.sessionId).toBeTruthy();
    }
  });

  it('hashes email before logging (PII masking — OWASP A09)', async () => {
    const { auditLogger } = await import('@/services/auditLogger');
    auditLogger._resetForTest();

    await auditLogger.logLogin('user@example.com');
    const queue = auditLogger._getQueue();

    const event = queue[0];
    expect(event).toBeDefined();
    if (event) {
      // Email hash should be present, not the raw email
      expect(event.metadata).toHaveProperty('emailHash');
      expect((event.metadata as Record<string, unknown>)['emailHash']).not.toBe('user@example.com');
      // Verify raw email is NOT logged
      expect(JSON.stringify(event)).not.toContain('user@example.com');
    }
  });

  it('never logs passwords', async () => {
    const { auditLogger } = await import('@/services/auditLogger');
    auditLogger._resetForTest();

    await auditLogger.logLoginFailed('user@example.com');
    const queue = auditLogger._getQueue();

    const eventStr = JSON.stringify(queue);
    expect(eventStr).not.toContain('password');
    expect(eventStr).not.toContain('secret');
  });

  it('sets userId when user is authenticated', async () => {
    const { auditLogger } = await import('@/services/auditLogger');
    auditLogger._resetForTest();
    auditLogger.setUser('user-123');

    auditLogger.logLogout();
    const queue = auditLogger._getQueue();

    const event = queue[0];
    expect(event?.userId).toBe('user-123');
  });

  it('userId is null when not authenticated', async () => {
    const { auditLogger } = await import('@/services/auditLogger');
    auditLogger._resetForTest();
    auditLogger.setUser(null);

    auditLogger.logLogout();
    const queue = auditLogger._getQueue();

    expect(queue[0]?.userId).toBeNull();
  });

  it('uses sendBeacon on page unload', async () => {
    const sendBeaconSpy = vi.spyOn(navigator, 'sendBeacon').mockReturnValue(true);
    const { auditLogger } = await import('@/services/auditLogger');
    auditLogger._resetForTest();
    auditLogger.logLogout();

    // Trigger visibilitychange to hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(sendBeaconSpy).toHaveBeenCalled();
    const [url] = sendBeaconSpy.mock.calls[0] as [string, Blob];
    expect(url).toBe('http://localhost:8080/api/audit/events');
  });

  it('logSearch logs term length, not the raw term', async () => {
    const { auditLogger } = await import('@/services/auditLogger');
    auditLogger._resetForTest();

    auditLogger.logSearch('The Dark Knight');
    const queue = auditLogger._getQueue();

    const event = queue[0];
    expect(event?.action).toBe('search_performed');
    expect((event?.metadata as Record<string, unknown>)?.['termLength']).toBe(15);
    expect(JSON.stringify(event)).not.toContain('The Dark Knight');
  });
});
