import { useState, useCallback, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(254, 'Email too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password too long'),
});

type LoginErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 60_000;
const SUBMIT_COOLDOWN_MS = 2_000;

/**
 * Login page with:
 * - Zod schema validation (OWASP A03)
 * - Generic error messages — no user enumeration (OWASP A07)
 * - Client-side rate limiting: 2s cooldown, 5-failure lockout (THR-005)
 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const failureTimestamps = useRef<number[]>([]);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      setServerError('');

      if (isLocked || isSubmitting) return;

      // Client-side validation
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        const fieldErrors: LoginErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof LoginErrors;
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      setIsSubmitting(true);

      // Start 2-second cooldown regardless of outcome (THR-005)
      cooldownTimer.current = setTimeout(() => setIsSubmitting(false), SUBMIT_COOLDOWN_MS);

      try {
        await login(email, password);
        // Clear failure history on success
        failureTimestamps.current = [];
        navigate(from, { replace: true });
      } catch {
        // Generic error — never expose whether email exists (OWASP A07)
        setServerError('Invalid email or password');

        // Track failures for lockout
        const now = Date.now();
        failureTimestamps.current = [
          ...failureTimestamps.current.filter((t) => now - t < LOCKOUT_WINDOW_MS),
          now,
        ];

        if (failureTimestamps.current.length >= LOCKOUT_ATTEMPTS) {
          setIsLocked(true);
          setTimeout(() => {
            setIsLocked(false);
            failureTimestamps.current = [];
          }, LOCKOUT_WINDOW_MS);
        }
      }
    },
    [email, password, isLocked, isSubmitting, login, navigate, from]
  );

  return (
    <main style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem' }}>
      <h1>Sign In</h1>

      {isLocked && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          Too many failed attempts. Please wait 60 seconds before trying again.
        </div>
      )}

      {serverError && !isLocked && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLocked}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
          {errors.email && (
            <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
              {errors.email}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isLocked}
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
          {errors.password && (
            <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
              {errors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isLocked}
          style={{ width: '100%', padding: '0.75rem', cursor: isSubmitting || isLocked ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Don&apos;t have an account? <Link to="/register">Register</Link>
      </p>
    </main>
  );
}
