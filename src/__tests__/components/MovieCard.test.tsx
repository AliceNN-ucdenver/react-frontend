import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MovieCard } from '@/components/MovieCard';
import type { MovieSummary } from '@/types/movie';

const validMovie: MovieSummary = {
  id: 'movie-1',
  title: 'The Dark Knight',
  year: 2008,
  genre: ['Action', 'Crime'],
  posterUrl: 'https://images.cdn.imdb-lite.com/posters/dark-knight.jpg',
  averageRating: 4.8,
  reviewCount: 1234,
};

describe('MovieCard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders movie title, year, and rating', () => {
    render(
      <MemoryRouter>
        <MovieCard movie={validMovie} />
      </MemoryRouter>
    );

    expect(screen.getByText('The Dark Knight')).toBeInTheDocument();
    expect(screen.getByText('2008')).toBeInTheDocument();
    expect(screen.getByText(/4\.8/)).toBeInTheDocument();
  });

  it('renders valid CDN image URL', () => {
    render(
      <MemoryRouter>
        <MovieCard movie={validMovie} />
      </MemoryRouter>
    );

    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toBe('https://images.cdn.imdb-lite.com/posters/dark-knight.jpg');
  });

  it('falls back to placeholder for non-CDN image URLs (OWASP A10)', () => {
    const movieWithBadUrl: MovieSummary = {
      ...validMovie,
      posterUrl: 'https://evil.com/image.jpg',
    };

    render(
      <MemoryRouter>
        <MovieCard movie={movieWithBadUrl} />
      </MemoryRouter>
    );

    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('/placeholder-movie.svg');
  });

  it('link points to internal movie detail route', () => {
    render(
      <MemoryRouter>
        <MovieCard movie={validMovie} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link') as HTMLAnchorElement;
    expect(link.href).toContain('/movies/movie-1');
  });

  it('sanitizes title before rendering (THR-006 XSS prevention)', () => {
    const xssMovie: MovieSummary = {
      ...validMovie,
      title: '<script>alert("xss")</script>Safe Title',
    };

    render(
      <MemoryRouter>
        <MovieCard movie={xssMovie} />
      </MemoryRouter>
    );

    // Script tag should not appear in DOM
    expect(document.querySelector('script')).toBeNull();
  });
});
