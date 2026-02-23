/**
 * Validates that a URL matches the allowlisted CDN domain pattern.
 * OWASP A10 - SSRF variant: prevents rendering of arbitrary external image URLs.
 */
const CDN_ALLOWLIST_PATTERN = /^https:\/\/[\w.-]+\.cdn\.imdb-lite\.com\//;

/**
 * Blocked URI schemes that can execute JavaScript or embed data.
 * OWASP A03 - prevents href injection attacks.
 */
const BLOCKED_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

/**
 * Validates that an image URL comes from the allowlisted CDN domain.
 */
export function isValidCdnUrl(url: string): boolean {
  return CDN_ALLOWLIST_PATTERN.test(url);
}

/**
 * Validates that an href URL is safe (not a javascript: or data: URI).
 */
export function isSafeHref(url: string): boolean {
  const lowerUrl = url.toLowerCase().trim();
  return !BLOCKED_SCHEMES.some((scheme) => lowerUrl.startsWith(scheme));
}

/**
 * Returns the URL if it's a valid CDN URL, otherwise returns the placeholder path.
 */
export function getCdnUrlOrPlaceholder(url: string, placeholder = '/placeholder-movie.svg'): string {
  return isValidCdnUrl(url) ? url : placeholder;
}
