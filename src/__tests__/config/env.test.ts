import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('env config', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports env object when valid env vars are set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubEnv('VITE_CDN_BASE_URL', 'https://cdn.imdb-lite.com');
    vi.stubEnv('VITE_AUDIT_ENDPOINT', 'http://localhost:8080/api/audit/events');

    const { env } = await import('@/config/env');
    expect(env.VITE_API_BASE_URL).toBe('http://localhost:8080');
    expect(env.VITE_CDN_BASE_URL).toBe('https://cdn.imdb-lite.com');
  });

  it('throws when VITE_API_BASE_URL is missing', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_CDN_BASE_URL', 'https://cdn.imdb-lite.com');

    await expect(import('@/config/env')).rejects.toThrow();
  });

  it('throws when VITE_API_BASE_URL is not a URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'not-a-url');
    vi.stubEnv('VITE_CDN_BASE_URL', 'https://cdn.imdb-lite.com');

    await expect(import('@/config/env')).rejects.toThrow('VITE_API_BASE_URL');
  });

  it('allows VITE_AUDIT_ENDPOINT to be optional', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
    vi.stubEnv('VITE_CDN_BASE_URL', 'https://cdn.imdb-lite.com');
    vi.stubEnv('VITE_AUDIT_ENDPOINT', '');

    const { env } = await import('@/config/env');
    expect(env.VITE_AUDIT_ENDPOINT).toBeUndefined();
  });
});
