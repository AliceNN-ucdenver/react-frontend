import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from '@/pages/SearchPage';

// Mock the apiFetch module
vi.mock('@/services/apiClient', () => ({
  apiFetch: vi.fn().mockResolvedValue({
    movies: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  configureApiClient: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
}));

vi.mock('@/services/auditLogger', () => ({
  auditLogger: {
    logSearch: vi.fn(),
    setUser: vi.fn(),
    resetSession: vi.fn(),
  },
}));

describe('SearchPage', () => {
  const user = userEvent.setup({ delay: null });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('rejects input with angle brackets (XSS prevention — OWASP A03)', async () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('searchbox');
    await act(async () => {
      await user.type(input, '<script>alert(1)</script>');
      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert').textContent).toMatch(/invalid/i);
    });
  });

  it('rejects input with HTML injection characters', async () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('searchbox');
    await act(async () => {
      await user.type(input, 'test<>injection');
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('accepts valid alphanumeric search terms', async () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    const input = screen.getByRole('searchbox');
    await act(async () => {
      await user.type(input, 'The Dark Knight');
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows empty state message when no results', async () => {
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch).mockResolvedValueOnce({
      movies: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });

    render(
      <MemoryRouter initialEntries={['/?q=batman']}>
        <SearchPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    });
  });
});
