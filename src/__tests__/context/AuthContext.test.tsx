import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// A minimal test component that exposes auth state
function AuthDisplay() {
  const { user, isAuthenticated, hasRole } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="role">{user?.role ?? 'none'}</span>
      <span data-testid="is-admin">{String(hasRole('admin'))}</span>
      <span data-testid="is-reviewer">{String(hasRole('reviewer'))}</span>
      <span data-testid="token-in-storage">
        {String(
          localStorage.getItem('token') !== null || sessionStorage.getItem('token') !== null
        )}
      </span>
    </div>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => void logout()}>Logout</button>;
}

// Build a minimal JWT for testing (not signed, for decode-only tests)
function buildTestJwt(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload }));
  const sig = 'fake-signature';
  return `${header}.${body}.${sig}`;
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts unauthenticated', async () => {
    // Mock silent refresh to fail immediately
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
  });

  it('JWT is never stored in localStorage or sessionStorage (OWASP A07)', async () => {
    const token = buildTestJwt({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'viewer',
      displayName: 'Test User',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: token }), { status: 200 })
      )
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    // Critical security assertion: token must NOT be in storage
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
    // The indicator in our test component checks storage
    expect(screen.getByTestId('token-in-storage').textContent).toBe('false');
  });

  it('sets user from decoded JWT payload', async () => {
    const token = buildTestJwt({
      sub: 'user-1',
      email: 'alice@example.com',
      role: 'reviewer',
      displayName: 'Alice',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: token }), { status: 200 })
      )
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('alice@example.com');
      expect(screen.getByTestId('role').textContent).toBe('reviewer');
    });
  });

  it('clears token from memory on logout', async () => {
    const token = buildTestJwt({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'viewer',
      displayName: 'Test User',
    });

    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: silent refresh succeeds
          return Promise.resolve(
            new Response(JSON.stringify({ accessToken: token }), { status: 200 })
          );
        }
        // Logout call
        return Promise.resolve(new Response(null, { status: 204 }));
      })
    );

    render(
      <AuthProvider>
        <AuthDisplay />
        <LogoutButton />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('none');
    });

    // Verify no token in storage after logout
    expect(localStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('hasRole returns true for admin on all role checks', async () => {
    const token = buildTestJwt({
      sub: 'admin-1',
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Admin User',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: token }), { status: 200 })
      )
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('true');
      expect(screen.getByTestId('is-reviewer').textContent).toBe('true');
    });
  });

  it('hasRole returns false for non-admin when checking admin role', async () => {
    const token = buildTestJwt({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'viewer',
      displayName: 'Viewer',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: token }), { status: 200 })
      )
    );

    render(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('false');
    });
  });
});
