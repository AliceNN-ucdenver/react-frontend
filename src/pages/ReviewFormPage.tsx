import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { apiFetch } from '@/services/apiClient';
import { sanitizeText } from '@/utils/sanitize';
import { auditLogger } from '@/services/auditLogger';

const reviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5'),
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title too long')
    .regex(/^[a-zA-Z0-9\s.,!?'\-]+$/, 'Title contains invalid characters'),
  body: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(2000, 'Review too long'),
});

type ReviewErrors = Partial<Record<keyof z.infer<typeof reviewSchema>, string>>;

export function ReviewFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const movieId = searchParams.get('movieId') ?? '';

  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [serverError, setServerError] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sanitized preview — never render raw user input (OWASP A03)
  const previewTitle = sanitizeText(title);
  const previewBody = sanitizeText(body);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      setServerError('');
      setDuplicateError(false);

      if (!movieId) {
        setServerError('Invalid movie ID. Please navigate from a movie page.');
        return;
      }

      const parsed = reviewSchema.safeParse({ rating, title, body });
      if (!parsed.success) {
        const fieldErrors: ReviewErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof ReviewErrors;
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      setIsSubmitting(true);
      try {
        await apiFetch(`/api/movies/${encodeURIComponent(movieId)}/reviews`, {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });

        auditLogger.logReviewSubmitted(movieId);
        navigate(`/movies/${encodeURIComponent(movieId)}`, { replace: true });
      } catch (err) {
        // Duck-type check for 409 to work in both real and test environments
        const status = (err as { status?: number }).status;
        if (status === 409) {
          setDuplicateError(true);
        } else {
          setServerError('Failed to submit review. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [movieId, rating, title, body, navigate]
  );

  if (!movieId) {
    return (
      <main style={{ padding: '2rem' }}>
        <p role="alert" style={{ color: 'red' }}>
          Invalid movie ID. Please navigate from a movie page.
        </p>
        <Link to="/">Return to Catalog</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
      <h1>Write a Review</h1>
      <Link to={`/movies/${encodeURIComponent(movieId)}`} style={{ display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to Movie
      </Link>

      {serverError && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          {serverError}
        </div>
      )}

      {duplicateError && (
        <div role="alert" style={{ color: 'orange', marginBottom: '1rem' }}>
          You have already reviewed this movie.
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="rating">Rating (1–5)</label>
          <select
            id="rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n} {'⭐'.repeat(n)}
              </option>
            ))}
          </select>
          {errors.rating && (
            <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
              {errors.rating}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="review-title">Review Title</label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
          {errors.title && (
            <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
              {errors.title}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="review-body">Review ({body.length}/2000)</label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={8}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
          {errors.body && (
            <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
              {errors.body}
            </span>
          )}
        </div>

        {(previewTitle || previewBody) && (
          <section
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              background: '#f9f9f9',
            }}
          >
            <h2 style={{ fontSize: '1rem', marginTop: 0 }}>Preview</h2>
            <strong>{previewTitle}</strong>
            <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{previewBody}</p>
          </section>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ padding: '0.75rem 2rem', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </main>
  );
}
