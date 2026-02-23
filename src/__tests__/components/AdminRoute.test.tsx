import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute } from '@/components/AdminRoute';
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

describe('AdminRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    mockAuth({ isAuthenticated: false });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin Content</div>
              </AdminRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects non-admin authenticated users to /unauthorized', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'user@test.com', role: 'reviewer', displayName: 'Reviewer' },
      hasRole: vi.fn().mockImplementation((role) => role === 'viewer' || role === 'reviewer'),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin Content</div>
              </AdminRoute>
            }
          />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders children for admin users', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'admin@test.com', role: 'admin', displayName: 'Admin' },
      hasRole: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <div>Admin Content</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});
