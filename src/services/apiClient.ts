import { getCorrelationId } from '@/utils/correlationId';

type TokenProvider = () => string | null;
type LogoutHandler = () => void;
type ShowToast = (message: string) => void;

let getToken: TokenProvider = () => null;
let handleLogout: LogoutHandler = () => undefined;
let showErrorToast: ShowToast = () => undefined;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Configure the API client with auth callbacks.
 * Called once during app initialization to avoid circular dependencies.
 */
export function configureApiClient(config: {
  getToken: TokenProvider;
  onLogout: LogoutHandler;
  onError: ShowToast;
}): void {
  getToken = config.getToken;
  handleLogout = config.onLogout;
  showErrorToast = config.onError;
}

/**
 * Read the XSRF-TOKEN cookie for CSRF protection.
 * OWASP A01 - sends X-XSRF-TOKEN on state-mutating requests.
 */
function getCsrfToken(): string | null {
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('XSRF-TOKEN='));
  return match != null ? decodeURIComponent(match.split('=')[1] ?? '') : null;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Core fetch wrapper with:
 * - Authorization header injection
 * - CSRF token injection on mutating requests (OWASP A01)
 * - Correlation ID header (THR-003)
 * - 10-second timeout via AbortController (THR-005 DoS mitigation)
 * - 401/403/5xx response interception
 * - No raw error exposure to UI (OWASP A04)
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { method?: string } = {}
): Promise<T> {
  const baseUrl = import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:8080';
  const url = `${baseUrl}${path}`;
  const method = (options.method ?? 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': getCorrelationId(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (MUTATING_METHODS.has(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw new Error('Network error. Please check your connection.');
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    handleLogout();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (response.status === 403) {
    window.location.href = '/unauthorized';
    throw new Error('Access denied.');
  }

  if (response.status >= 500) {
    // OWASP A04 - never expose raw server errors to the UI
    showErrorToast('Something went wrong. Please try again later.');
    throw new Error('Server error.');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(
      response.status,
      (body['message'] as string | undefined) ?? 'Request failed'
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
