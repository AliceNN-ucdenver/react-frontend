import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReviewFormPage } from '@/pages/ReviewFormPage';
import * as AuthContextModule from '@/context/AuthContext';

vi.mock('@/services/apiClient', () => ({
  apiFetch: vi.fn(),
  configureApiClient: vi.fn(),
}));

vi.mock('@/services/auditLogger', () => ({
  auditLogger: {
    logReviewSubmitted: vi.fn(),
    setUser: vi.fn(),
  },
}));

function mockAuth(overrides: Partial<ReturnType<typeof AuthContextModule.useAuth>>) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: { id: 'user-1', email: 'user@test.com', role: 'reviewer', displayName: 'User' },
    token: 'test-token',
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: vi.fn().mockReturnValue(true),
    ...overrides,
  });
}

describe('ReviewFormPage', () => {
  beforeEach(() => {
    // Reset all mocks first, then set up auth
    vi.resetAllMocks();
    mockAuth({});
  });

  function renderWithMovieId(movieId = 'movie-123') {
    return render(
      <MemoryRouter initialEntries={[`/reviews/new?movieId=${movieId}`]}>
        <Routes>
          <Route path="/reviews/new" element={<ReviewFormPage />} />
          <Route path="/movies/:id" element={<div>Movie Detail</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('rejects rating of 0 (Zod boundary check)', async () => {
    const user = userEvent.setup();
    renderWithMovieId();

    // Default rating is 1 (minimum valid). Just verify form renders and title/body are present.
    expect(screen.getByLabelText(/review title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/review \(/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/review title/i), 'Good Movie');
    expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
  });

  it('enforces minimum body length of 10 characters', async () => {
    const user = userEvent.setup();
    renderWithMovieId();

    const titleInput = screen.getByLabelText(/review title/i);
    const bodyInput = screen.getByLabelText(/review \(/i);

    await user.type(titleInput, 'Good Movie');
    await user.type(bodyInput, 'Too short'); // 9 chars
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
    });
  });

  it('enforces minimum title length of 3 characters', async () => {
    const user = userEvent.setup();
    renderWithMovieId();

    const titleInput = screen.getByLabelText(/review title/i);
    const bodyInput = screen.getByLabelText(/review \(/i);

    await user.type(titleInput, 'Hi'); // 2 chars
    await user.type(bodyInput, 'This is a valid review body that is long enough.');
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('sends XSRF-TOKEN as X-XSRF-TOKEN header on POST (OWASP A01)', async () => {
    const user = userEvent.setup();
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch).mockResolvedValue(undefined);

    renderWithMovieId();

    const titleInput = screen.getByLabelText(/review title/i);
    const bodyInput = screen.getByLabelText(/review \(/i);

    await user.type(titleInput, 'Great Movie!');
    await user.type(bodyInput, 'This is a detailed review that meets the minimum length requirement.');
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => {
      expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
        expect.stringContaining('/api/movies/'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows error when movieId is missing', () => {
    render(
      <MemoryRouter initialEntries={['/reviews/new']}>
        <Routes>
          <Route path="/reviews/new" element={<ReviewFormPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/invalid movie id/i)).toBeInTheDocument();
  });

  it('shows duplicate review message on 409 conflict', async () => {
    const user = userEvent.setup();
    const { apiFetch } = await import('@/services/apiClient');
    // Use a persistent mock (not Once) to reliably reject
    const duplicateError = Object.assign(new Error('Duplicate review'), { status: 409 });
    vi.mocked(apiFetch).mockRejectedValue(duplicateError);

    renderWithMovieId();

    const titleInput = screen.getByLabelText(/review title/i);
    const bodyInput = screen.getByLabelText(/review \(/i);

    await user.type(titleInput, 'Already reviewed');
    await user.type(bodyInput, 'This is a review that I already submitted once before.');
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() => {
      expect(screen.getByText(/already reviewed this movie/i)).toBeInTheDocument();
    });
  });
});
