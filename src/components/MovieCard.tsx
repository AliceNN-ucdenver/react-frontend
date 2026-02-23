import { Link } from 'react-router-dom';
import { sanitizeText } from '@/utils/sanitize';
import { getCdnUrlOrPlaceholder } from '@/utils/urlValidator';
import type { MovieSummary } from '@/types/movie';

interface MovieCardProps {
  movie: MovieSummary;
}

/**
 * Movie card component with security controls:
 * - All text fields sanitized with DOMPurify (THR-006 XSS prevention)
 * - Image src validated against CDN allowlist (OWASP A10)
 * - Explicit width/height to prevent layout shift
 * - onerror fallback to local placeholder image
 */
export function MovieCard({ movie }: MovieCardProps) {
  const title = sanitizeText(movie.title);
  const posterSrc = getCdnUrlOrPlaceholder(movie.posterUrl);

  return (
    <article
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s',
      }}
    >
      <Link to={`/movies/${encodeURIComponent(movie.id)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <img
          src={posterSrc}
          alt={`Poster for ${title}`}
          width={300}
          height={450}
          style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/placeholder-movie.svg';
          }}
          loading="lazy"
        />
        <div style={{ padding: '1rem' }}>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{title}</h3>
          <p style={{ margin: '0 0 0.25rem', color: '#666', fontSize: '0.875rem' }}>
            {movie.year}
          </p>
          <p style={{ margin: '0', fontSize: '0.875rem' }}>
            ⭐ {movie.averageRating.toFixed(1)} ({movie.reviewCount} reviews)
          </p>
        </div>
      </Link>
    </article>
  );
}
