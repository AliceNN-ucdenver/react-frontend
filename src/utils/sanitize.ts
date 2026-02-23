import DOMPurify from 'dompurify';

/**
 * Sanitizes a string for safe plain-text rendering.
 * Strips ALL HTML tags and attributes.
 * Use for titles, names, and other text-only fields. (THR-006 XSS prevention)
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitizes a string for safe HTML rendering (e.g., synopsis with basic formatting).
 * Only allows a restricted set of safe tags.
 * Use for user-generated content that may contain basic formatting. (OWASP A03)
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    FORCE_BODY: false,
  });
}
