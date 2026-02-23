import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import * as AuthContextModule from '@/context/AuthContext';

function mockAuth(overrides: Partial<ReturnType<typeof AuthContextModule.useAuth>>) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: null,
    token: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: vi.fn().mockReturnValue(false),
    ...overrides,
  });
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    mockAuth({ isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to /unauthorized when role is insufficient', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'user@test.com', role: 'viewer', displayName: 'User' },
      hasRole: vi.fn().mockReturnValue(false),
    });

    render(
      <MemoryRouter initialEntries={['/reviewer-only']}>
        <Routes>
          <Route
            path="/reviewer-only"
            element={
              <ProtectedRoute requiredRole="reviewer">
                <div>Reviewer Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    expect(screen.queryByText('Reviewer Content')).not.toBeInTheDocument();
  });

  it('renders children when authenticated and authorized', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'user@test.com', role: 'reviewer', displayName: 'User' },
      hasRole: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute requiredRole="reviewer">
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders children when authenticated and no role required', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'user@test.com', role: 'viewer', displayName: 'User' },
      hasRole: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Viewer Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Viewer Content')).toBeInTheDocument();
  });
});
