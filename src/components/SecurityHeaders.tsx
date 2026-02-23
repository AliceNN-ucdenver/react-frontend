/**
 * SecurityHeaders component renders the CSP meta tag dynamically.
 * Testable in isolation. Complements the static CSP meta tag in index.html.
 * OWASP A05 - Security Misconfiguration prevention (THR-006).
 */
export function SecurityHeaders() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://*.cdn.imdb-lite.com data:",
    `connect-src 'self' ${import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:8080'}`,
    "frame-ancestors 'none'",
  ].join('; ');

  return (
    <>
      <meta httpEquiv="Content-Security-Policy" content={csp} />
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta name="referrer" content="strict-origin-when-cross-origin" />
    </>
  );
}
