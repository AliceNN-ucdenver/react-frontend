import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';

// Top common passwords blocklist (representative subset — expand in production)
const COMMON_PASSWORDS = new Set([
  'password', 'password1', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'princess', 'welcome', 'shadow',
  'superman', 'michael', 'football', '12345', '123456789', 'password2',
  'qwerty123', '1q2w3e4r', 'admin', 'admin123', 'root', 'toor',
  'pass', 'test', 'guest', 'login', 'changeme', 'default',
  'secret', '111111', '000000', 'password123', '1234', '12345678',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'pass1234', 'welcome1',
]);

const registerSchema = z
  .object({
    email: z.string().email('Invalid email address').max(254, 'Email too long'),
    displayName: z
      .string()
      .min(2, 'Display name must be at least 2 characters')
      .max(50, 'Display name too long')
      .regex(/^[a-zA-Z0-9_ -]+$/, 'Only letters, numbers, spaces, underscores, and hyphens allowed'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterErrors = Partial<Record<keyof z.infer<typeof registerSchema>, string>>;

interface RegisterResponse {
  accessToken: string;
}

/**
 * Registration page with:
 * - Zod schema validation with allowlist regex (OWASP A03)
 * - Common password blocklist check
 * - Generic error messages (OWASP A07)
 */
export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrors({});
      setServerError('');

      const parsed = registerSchema.safeParse({ email, displayName, password, confirmPassword });
      if (!parsed.success) {
        const fieldErrors: RegisterErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] as keyof RegisterErrors;
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
        return;
      }

      // Common password check (client-side only, not a security boundary)
      if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        setErrors({ password: 'This password is too common. Please choose a stronger password.' });
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch(
          `${import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:8080'}/api/auth/register`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, displayName, password }),
          }
        );

        if (!response.ok) {
          // Generic error — never expose whether email exists (OWASP A07)
          setServerError('Registration failed. Please try again.');
          return;
        }

        const data = (await response.json()) as RegisterResponse;
        // Log in automatically after registration
        void data;
        await login(email, password);
        navigate('/', { replace: true });
      } catch {
        setServerError('Registration failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, displayName, password, confirmPassword, login, navigate]
  );

  return (
    <main style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem' }}>
      <h1>Create Account</h1>

      {serverError && (
        <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          {serverError}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} noValidate>
        {[
          { id: 'email', label: 'Email', type: 'email', value: email, onChange: setEmail, autoComplete: 'email' },
          { id: 'displayName', label: 'Display Name', type: 'text', value: displayName, onChange: setDisplayName, autoComplete: 'username' },
          { id: 'password', label: 'Password', type: 'password', value: password, onChange: setPassword, autoComplete: 'new-password' },
          { id: 'confirmPassword', label: 'Confirm Password', type: 'password', value: confirmPassword, onChange: setConfirmPassword, autoComplete: 'new-password' },
        ].map(({ id, label, type, value, onChange, autoComplete }) => (
          <div key={id} style={{ marginBottom: '1rem' }}>
            <label htmlFor={id}>{label}</label>
            <input
              id={id}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoComplete={autoComplete}
              style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            />
            {errors[id as keyof RegisterErrors] && (
              <span role="alert" style={{ color: 'red', fontSize: '0.875rem' }}>
                {errors[id as keyof RegisterErrors]}
              </span>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: '100%', padding: '0.75rem', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Sign In</Link>
      </p>
    </main>
  );
}
