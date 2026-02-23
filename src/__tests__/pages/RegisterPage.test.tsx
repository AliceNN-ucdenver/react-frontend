import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '@/pages/RegisterPage';
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

describe('RegisterPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockAuth({});
  });

  it('rejects display names with special characters', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'User<script>');
    await user.type(screen.getAllByLabelText(/password/i)[0]!, 'StrongPass123');
    await user.type(screen.getAllByLabelText(/password/i)[1]!, 'StrongPass123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Error: "Only letters, numbers, spaces, underscores, and hyphens allowed"
      expect(screen.getByText(/only letters/i)).toBeInTheDocument();
    });
  });

  it('rejects common passwords', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'ValidUser');
    await user.type(screen.getAllByLabelText(/password/i)[0]!, 'password');
    await user.type(screen.getAllByLabelText(/password/i)[1]!, 'password');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/too common/i)).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'ValidUser');
    await user.type(screen.getAllByLabelText(/password/i)[0]!, 'StrongPass123');
    await user.type(screen.getAllByLabelText(/password/i)[1]!, 'DifferentPass456');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/don.t match/i)).toBeInTheDocument();
    });
  });

  it('shows generic error on server failure (OWASP A07)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Email already exists' }), { status: 409 }))
    );

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/display name/i), 'ValidUser');
    await user.type(screen.getAllByLabelText(/password/i)[0]!, 'StrongPass456');
    await user.type(screen.getAllByLabelText(/password/i)[1]!, 'StrongPass456');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      // Generic error — must NOT expose 'Email already exists'
      const errorEl = screen.getByRole('alert');
      expect(errorEl.textContent).toMatch(/registration failed/i);
      expect(errorEl.textContent).not.toMatch(/email already exists/i);
    });
  });
});
