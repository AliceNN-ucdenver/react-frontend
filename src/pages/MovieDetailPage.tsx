import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '@/services/apiClient';
import { ActorCard } from '@/components/ActorCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { sanitizeText, sanitizeHtml } from '@/utils/sanitize';
import { getCdnUrlOrPlaceholder } from '@/utils/urlValidator';
import { useAuth } from '@/context/AuthContext';
import type { Movie } from '@/types/movie';
import type { Review } from '@/types/review';

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, hasRole } = useAuth();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const movieId = encodeURIComponent(id);
    setIsLoading(true);
    setError('');

    Promise.all([
      apiFetch<Movie>(`/api/movies/${movieId}`),
      apiFetch<Review[]>(`/api/movies/${movieId}/reviews`),
    ])
      .then(([movieData, reviewData]) => {
        setMovie(movieData);
        setReviews(reviewData);
      })
      .catch(() => {
        setError('Failed to load movie details. Please try again.');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <LoadingSkeleton height="2rem" width="60%" />
        <div style={{ marginTop: '1rem' }}>
          <LoadingSkeleton height="400px" />
        </div>
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        <p role="alert" style={{ color: 'red' }}>
          {error || 'Movie not found.'}
        </p>
        <Link to="/">Back to Catalog</Link>
      </main>
    );
  }

  const title = sanitizeText(movie.title);
  const synopsis = sanitizeHtml(movie.synopsis);
  const posterSrc = getCdnUrlOrPlaceholder(movie.posterUrl);

  const canReview = isAuthenticated && hasRole('reviewer');

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to Catalog
      </Link>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <img
          src={posterSrc}
          alt={`Poster for ${title}`}
          width={300}
          height={450}
          style={{ borderRadius: '8px', objectFit: 'cover' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/placeholder-movie.svg';
          }}
        />

        <div style={{ flex: 1, minWidth: '250px' }}>
          <h1>{title}</h1>
          <p style={{ color: '#666' }}>
            {movie.year} &bull; {movie.genre.map(sanitizeText).join(', ')}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
            <span>⭐ {movie.averageRating.toFixed(1)}</span>
            <span style={{ color: '#666' }}>({movie.reviewCount} reviews)</span>
          </div>

          {/* synopsis may contain basic formatting — use sanitizeHtml */}
          <div
            style={{ marginTop: '1rem', lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: synopsis }}
          />

          {canReview && (
            <Link
              to={`/reviews/new?movieId=${encodeURIComponent(movie.id)}`}
              style={{
                display: 'inline-block',
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                background: '#0070f3',
                color: '#fff',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              Write a Review
            </Link>
          )}
        </div>
      </div>

      {movie.cast.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Cast</h2>
          <div>
            {movie.cast.map((member) => (
              <ActorCard key={member.actorId} cast={member} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '2rem' }}>
        <h2>Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p>No reviews yet. Be the first to write one!</p>
        ) : (
          <div>
            {reviews.map((review) => (
              <article
                key={review.id}
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <header>
                  <strong>{sanitizeText(review.title)}</strong>
                  <span style={{ marginLeft: '0.5rem' }}>{'⭐'.repeat(review.rating)}</span>
                  <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.875rem' }}>
                    by {sanitizeText(review.authorDisplayName)}
                  </span>
                </header>
                {/* review body may contain user-generated content — sanitize as HTML */}
                <div
                  style={{ marginTop: '0.5rem', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(review.body) }}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
