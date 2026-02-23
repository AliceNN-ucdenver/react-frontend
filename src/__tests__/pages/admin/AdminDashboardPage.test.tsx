import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import * as AuthContextModule from '@/context/AuthContext';

vi.mock('@/services/auditLogger', () => ({
  auditLogger: {
    logAdminPageAccess: vi.fn(),
    logUnauthorizedAccess: vi.fn(),
    setUser: vi.fn(),
  },
}));

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

describe('AdminDashboardPage', () => {
  it('renders admin panel for admin users', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'admin@test.com', role: 'admin', displayName: 'Admin User' },
      hasRole: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Role: admin')).toBeInTheDocument();
  });

  it('never displays JWT token in the UI (OWASP A04)', () => {
    const sensitiveToken = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature';
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'admin@test.com', role: 'admin', displayName: 'Admin' },
      token: sensitiveToken,
      hasRole: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(document.body.textContent).not.toContain(sensitiveToken);
    expect(document.body.textContent).not.toContain('eyJhbGc');
  });

  it('shows navigation links for admin sub-routes', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', email: 'admin@test.com', role: 'admin', displayName: 'Admin' },
      hasRole: vi.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<AdminDashboardPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getByText('Add Movie')).toBeInTheDocument();
    expect(screen.getByText('Actors')).toBeInTheDocument();
  });
});
