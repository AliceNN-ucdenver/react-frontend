import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, configureApiClient, ApiError } from '@/services/apiClient';

function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  const responseHeaders = new Headers(headers);
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: responseHeaders,
    })
  );
}

describe('apiClient', () => {
  let logoutSpy: ReturnType<typeof vi.fn>;
  let toastSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logoutSpy = vi.fn();
    toastSpy = vi.fn();
    configureApiClient({
      getToken: () => 'test-token-abc',
      onLogout: logoutSpy,
      onError: toastSpy,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches Authorization header with bearer token', async () => {
    const fetchMock = mockFetch(200, { data: 'ok' });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token-abc');
  });

  it('attaches X-Correlation-ID header', async () => {
    const fetchMock = mockFetch(200, { data: 'ok' });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['X-Correlation-ID']).toBeTruthy();
  });

  it('calls logout and redirects on 401 (OWASP A07)', async () => {
    const fetchMock = mockFetch(401, { message: 'Unauthorized' });
    vi.stubGlobal('fetch', fetchMock);

    // Mock window.location.href setter
    const locationSpy = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    } as Location);

    await expect(apiFetch('/api/protected')).rejects.toThrow();
    expect(logoutSpy).toHaveBeenCalled();
    locationSpy.mockRestore();
  });

  it('does not expose raw error stack traces to caller (OWASP A04)', async () => {
    const fetchMock = mockFetch(500, { error: 'Internal server error', stack: 'Error: secret\n  at ...' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/test')).rejects.toThrow('Server error.');
    // Toast shows generic message, not raw error
    expect(toastSpy).toHaveBeenCalledWith('Something went wrong. Please try again later.');
  });

  it('shows generic error message on 5xx (OWASP A04)', async () => {
    const fetchMock = mockFetch(503, { message: 'Service Unavailable' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/test')).rejects.toThrow('Server error.');
    expect(toastSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
  });

  it('throws ApiError with status for 4xx errors', async () => {
    const fetchMock = mockFetch(400, { message: 'Validation failed' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/test')).rejects.toBeInstanceOf(ApiError);
    try {
      await apiFetch('/api/test');
    } catch (e) {
      if (e instanceof ApiError) {
        expect(e.status).toBe(400);
      }
    }
  });

  it('aborts request on timeout', async () => {
    vi.useFakeTimers();
    // Fetch mock that rejects immediately when the AbortSignal fires
    const fetchMock = vi.fn().mockImplementation((_url: string, options: RequestInit) => {
      return new Promise((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = apiFetch('/api/slow');
    // Attach rejection handler BEFORE advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow();
    // Advance past the 10s timeout
    await vi.advanceTimersByTimeAsync(10_001);

    await assertion;
    vi.useRealTimers();
  });

  it('sends credentials: include for httpOnly cookie support', async () => {
    const fetchMock = mockFetch(200, {});
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe('include');
  });

  it('adds X-XSRF-TOKEN header on POST requests (OWASP A01 CSRF)', async () => {
    // Set a CSRF cookie
    Object.defineProperty(document, 'cookie', {
      value: 'XSRF-TOKEN=csrf-test-token-123',
      writable: true,
      configurable: true,
    });

    const fetchMock = mockFetch(201, { id: 'new' });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/reviews', { method: 'POST', body: JSON.stringify({ data: 'test' }) });

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['X-XSRF-TOKEN']).toBe('csrf-test-token-123');
  });

  it('does NOT add X-XSRF-TOKEN header on GET requests', async () => {
    const fetchMock = mockFetch(200, {});
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/movies');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['X-XSRF-TOKEN']).toBeUndefined();
  });
});
