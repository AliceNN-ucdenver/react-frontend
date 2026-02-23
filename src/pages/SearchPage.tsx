import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { apiFetch } from '@/services/apiClient';
import { MovieCard } from '@/components/MovieCard';
import { MovieCardSkeleton } from '@/components/LoadingSkeleton';
import { auditLogger } from '@/services/auditLogger';
import type { PaginatedMovies } from '@/types/movie';

const DEBOUNCE_MS = 300;

/**
 * Allowlist regex for search input.
 * Rejects angle brackets, script-relevant characters, and regex special chars.
 * OWASP A03 - Injection prevention.
 */
const searchSchema = z
  .string()
  .max(100, 'Search term too long')
  .regex(/^[a-zA-Z0-9\s.,'\-]*$/, 'Search term contains invalid characters');

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Validate query param on load — apply same validation as user input (OWASP A03)
  const rawQuery = searchParams.get('q') ?? '';
  const initialQuery = searchSchema.safeParse(rawQuery).success ? rawQuery : '';

  const [inputValue, setInputValue] = useState(initialQuery);
  const [validatedQuery, setValidatedQuery] = useState(initialQuery);
  const [validationError, setValidationError] = useState('');
  const [results, setResults] = useState<PaginatedMovies | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setValidationError('');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const parsed = searchSchema.safeParse(value);
      if (!parsed.success) {
        setValidationError(parsed.error.errors[0]?.message ?? 'Invalid search term');
        return;
      }
      setValidatedQuery(parsed.data);
      // Persist to URL — use encodeURIComponent to prevent injection (OWASP A03)
      setSearchParams(parsed.data ? { q: parsed.data } : {}, { replace: true });
    }, DEBOUNCE_MS);
  }, [setSearchParams]);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!validatedQuery.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError('');

    // encodeURIComponent before appending to URL — never raw interpolation (OWASP A03)
    void apiFetch<PaginatedMovies>(
      `/api/movies?search=${encodeURIComponent(validatedQuery)}&limit=20`
    )
      .then((data) => {
        setResults(data);
        auditLogger.logSearch(validatedQuery);
      })
      .catch(() => {
        setError('Search failed. Please try again.');
      })
      .finally(() => setIsLoading(false));
  }, [validatedQuery]);

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1>Search Movies</h1>

      <div style={{ marginBottom: '2rem' }}>
        <label htmlFor="search-input" style={{ display: 'block', marginBottom: '0.5rem' }}>
          Search by title, actor, or genre
        </label>
        <input
          id="search-input"
          type="search"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Enter search term..."
          style={{ width: '100%', maxWidth: '500px', padding: '0.75rem', fontSize: '1rem' }}
          aria-describedby={validationError ? 'search-error' : undefined}
        />
        {validationError && (
          <p id="search-error" role="alert" style={{ color: 'red', marginTop: '0.25rem' }}>
            {validationError}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      {isLoading ? (
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}
          aria-label="Loading results"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      ) : results ? (
        results.movies.length > 0 ? (
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}
          >
            {results.movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <p>No results found for &quot;{inputValue}&quot;.</p>
        )
      ) : validatedQuery ? null : (
        <p>Enter a search term to find movies.</p>
      )}
    </main>
  );
}
