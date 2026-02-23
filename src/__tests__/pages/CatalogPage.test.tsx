import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CatalogPage } from '@/pages/CatalogPage';
import type { PaginatedMovies } from '@/types/movie';

vi.mock('@/services/apiClient', () => ({
  apiFetch: vi.fn(),
  configureApiClient: vi.fn(),
}));

const mockMovies: PaginatedMovies = {
  movies: [
    {
      id: 'movie-1',
      title: 'The Dark Knight',
      year: 2008,
      genre: ['Action'],
      posterUrl: 'https://images.cdn.imdb-lite.com/posters/dark-knight.jpg',
      averageRating: 4.8,
      reviewCount: 1200,
    },
    {
      id: 'movie-2',
      title: 'Inception',
      year: 2010,
      genre: ['Sci-Fi'],
      posterUrl: 'https://images.cdn.imdb-lite.com/posters/inception.jpg',
      averageRating: 4.7,
      reviewCount: 980,
    },
  ],
  total: 2,
  page: 1,
  limit: 12,
  totalPages: 1,
};

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton while fetching', async () => {
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => undefined)); // never resolves

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Loading movies')).toBeInTheDocument();
  });

  it('renders movie cards after loading', async () => {
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch).mockResolvedValueOnce(mockMovies);

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
      expect(screen.getByText('Inception')).toBeInTheDocument();
    });
  });

  it('shows empty state when no movies returned', async () => {
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch).mockResolvedValueOnce({
      movies: [],
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no movies found/i)).toBeInTheDocument();
    });
  });

  it('shows error message on fetch failure', async () => {
    const { apiFetch } = await import('@/services/apiClient');
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <CatalogPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
