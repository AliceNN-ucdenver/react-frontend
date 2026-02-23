import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/services/apiClient';
import { MovieCard } from '@/components/MovieCard';
import { MovieCardSkeleton } from '@/components/LoadingSkeleton';
import type { PaginatedMovies } from '@/types/movie';

const PAGE_SIZE = 12;

export function CatalogPage() {
  const [data, setData] = useState<PaginatedMovies | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMovies = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiFetch<PaginatedMovies>(
        `/api/movies?page=${pageNum}&limit=${PAGE_SIZE}`
      );
      setData(result);
    } catch {
      setError('Failed to load movies. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMovies(page);
  }, [fetchMovies, page]);

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Movie Catalog</h1>

      {error && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1.5rem',
          }}
          aria-label="Loading movies"
        >
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : data && data.movies.length > 0 ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {data.movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          <nav aria-label="Pagination" style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ marginRight: '1rem', padding: '0.5rem 1rem' }}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.totalPages}
              style={{ marginLeft: '1rem', padding: '0.5rem 1rem' }}
            >
              Next
            </button>
          </nav>
        </>
      ) : (
        <p>No movies found.</p>
      )}
    </main>
  );
}
