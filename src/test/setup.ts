import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock DOMPurify for tests (jsdom doesn't fully support it)
vi.mock('dompurify', () => ({
  default: {
    sanitize: (input: string, _config?: unknown) => input,
  },
}));

// Mock crypto.randomUUID
Object.defineProperty(globalThis.crypto, 'randomUUID', {
  value: () => 'test-uuid-1234-5678-abcd-ef0123456789',
  writable: true,
  configurable: true,
});

// Mock crypto.subtle.digest
Object.defineProperty(globalThis.crypto, 'subtle', {
  value: {
    digest: vi.fn().mockResolvedValue(new Uint8Array(32).fill(0).buffer),
  },
  writable: true,
  configurable: true,
});

// Mock navigator.sendBeacon
Object.defineProperty(navigator, 'sendBeacon', {
  value: vi.fn().mockReturnValue(true),
  writable: true,
  configurable: true,
});

// Mock import.meta.env
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080');
vi.stubEnv('VITE_CDN_BASE_URL', 'https://cdn.imdb-lite.com');
vi.stubEnv('VITE_AUDIT_ENDPOINT', 'http://localhost:8080/api/audit/events');
