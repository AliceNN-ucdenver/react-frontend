import { describe, it, expect } from 'vitest';
import { isValidCdnUrl, isSafeHref, getCdnUrlOrPlaceholder } from '@/utils/urlValidator';

describe('urlValidator', () => {
  describe('isValidCdnUrl', () => {
    it('accepts valid CDN URLs', () => {
      expect(isValidCdnUrl('https://images.cdn.imdb-lite.com/poster.jpg')).toBe(true);
      expect(isValidCdnUrl('https://media.cdn.imdb-lite.com/thumbnails/abc.png')).toBe(true);
      expect(isValidCdnUrl('https://static.cdn.imdb-lite.com/')).toBe(true);
    });

    it('rejects non-CDN URLs', () => {
      expect(isValidCdnUrl('https://evil.com/image.jpg')).toBe(false);
      expect(isValidCdnUrl('http://images.cdn.imdb-lite.com/poster.jpg')).toBe(false); // http not https
      expect(isValidCdnUrl('https://cdn.imdb-lite.com.evil.com/img.jpg')).toBe(false);
      expect(isValidCdnUrl('')).toBe(false);
    });

    it('rejects javascript: URIs', () => {
      expect(isValidCdnUrl('javascript:alert(1)')).toBe(false);
    });

    it('rejects data: URIs', () => {
      expect(isValidCdnUrl('data:image/png;base64,abc')).toBe(false);
    });
  });

  describe('isSafeHref', () => {
    it('accepts regular http/https URLs', () => {
      expect(isSafeHref('https://example.com')).toBe(true);
      expect(isSafeHref('http://example.com')).toBe(true);
      expect(isSafeHref('/relative/path')).toBe(true);
    });

    it('blocks javascript: URIs (OWASP A03)', () => {
      expect(isSafeHref('javascript:alert(1)')).toBe(false);
      expect(isSafeHref('JAVASCRIPT:alert(1)')).toBe(false);
      expect(isSafeHref('  javascript:void(0)')).toBe(false);
    });

    it('blocks data: URIs', () => {
      expect(isSafeHref('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('blocks vbscript: URIs', () => {
      expect(isSafeHref('vbscript:msgbox(1)')).toBe(false);
    });
  });

  describe('getCdnUrlOrPlaceholder', () => {
    it('returns CDN URL when valid', () => {
      const url = 'https://images.cdn.imdb-lite.com/poster.jpg';
      expect(getCdnUrlOrPlaceholder(url)).toBe(url);
    });

    it('returns placeholder for invalid URLs', () => {
      expect(getCdnUrlOrPlaceholder('https://evil.com/image.jpg')).toBe('/placeholder-movie.svg');
    });

    it('accepts custom placeholder', () => {
      expect(getCdnUrlOrPlaceholder('https://evil.com/image.jpg', '/custom.png')).toBe('/custom.png');
    });
  });
});
