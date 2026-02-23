import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MovieDetailPage } from '@/pages/MovieDetailPage';
import * as AuthContextModule from '@/context/AuthContext';
import type { Movie } from '@/types/movie';
import type { Review } from '@/types/review';

vi.mock('@/services/apiClient', () => ({
  apiFetch: vi.fn(),
  configureApiClient: vi.fn(),
}));

function mockAuth(isAuthenticated: boolean, role: string) {
  vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
    user: isAuthenticated ? { id: 'user-1', email: 'user@test.com', role: role as 'viewer' | 'reviewer' | 'admin', displayName: 'User' } : null,
    token: isAuthenticated ? 'token' : null,
    isAuthenticated,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: vi.fn().mockImplementation((r) => {
      if (!isAuthenticated) return false;
      if (r === 'viewer') return true;
      if (r === 'reviewer') return role === 'reviewer' || role === 'admin';
      return role === 'admin';
    }),
  });
}

const mockMovie: Movie = {
  id: 'movie-1',
  title: 'The Dark Knight',
  year: 2008,
  genre: ['Action', 'Crime'],
  synopsis: '<p>A great film</p><script>xss()</script>',
  posterUrl: 'https://images.cdn.imdb-lite.com/posters/dark-knight.jpg',
  averageRating: 4.8,
  reviewCount: 1200,
  cast: [{ actorId: 'actor-1', actorName: 'Christian Bale', characterName: 'Bruce Wayne' }],
};

const mockReviews: Review[] = [
  {
    id: 'review-1',
    movieId: 'movie-1',
    userId: 'user-1',
    authorDisplayName: 'Alice',
    rating: 5,
    title: 'Amazing film',
    body: 'Best superhero movie ever made.',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

describe('MovieDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(false, 'viewer');
  });

  it('renders movie details after loading', async () => {
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockMovie)
      .mockResolvedValueOnce(mockReviews);

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
      // Year is rendered in a paragraph alongside genre, e.g. "2008 • Action, Crime"
      expect(screen.getByText(/2008/)).toBeInTheDocument();
    });
  });

  it('does NOT show Write a Review button for unauthenticated users', async () => {
    mockAuth(false, 'viewer');
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockMovie)
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/write a review/i)).not.toBeInTheDocument();
    });
  });

  it('shows Write a Review button for reviewer role', async () => {
    mockAuth(true, 'reviewer');
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockMovie)
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/write a review/i)).toBeInTheDocument();
    });
  });

  it('sanitizes synopsis content (OWASP A03 XSS prevention)', async () => {
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(mockMovie)
      .mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/movies/movie-1']}>
        <Routes>
          <Route path="/movies/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Inline script tags should never appear in the DOM
      const scripts = document.querySelectorAll('script');
      // Only count scripts from the page itself, not from jsdom setup
      const inlineScripts = Array.from(scripts).filter(s => s.textContent?.includes('xss'));
      expect(inlineScripts).toHaveLength(0);
    });
  });
});
