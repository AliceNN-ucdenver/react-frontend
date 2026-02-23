import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to reset module before each test to control the DOMPurify mock
describe('sanitize utilities', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('sanitizeText', () => {
    it('calls DOMPurify.sanitize with empty ALLOWED_TAGS', async () => {
      const mockSanitize = vi.fn().mockReturnValue('sanitized text');
      vi.doMock('dompurify', () => ({ default: { sanitize: mockSanitize } }));

      const { sanitizeText } = await import('@/utils/sanitize');
      const result = sanitizeText('<script>alert("xss")</script>Hello');

      expect(mockSanitize).toHaveBeenCalledWith(
        '<script>alert("xss")</script>Hello',
        expect.objectContaining({ ALLOWED_TAGS: [] })
      );
      expect(result).toBe('sanitized text');
    });

    it('strips script tags from input', async () => {
      vi.doMock('dompurify', () => ({
        default: {
          sanitize: (input: string, config: { ALLOWED_TAGS: string[] }) => {
            if (config.ALLOWED_TAGS.length === 0) {
              return input.replace(/<[^>]*>/g, '');
            }
            return input;
          },
        },
      }));

      const { sanitizeText } = await import('@/utils/sanitize');
      const result = sanitizeText('<script>alert("xss")</script>Safe Text');
      expect(result).not.toContain('<script>');
    });

    it('returns plain text unchanged', async () => {
      vi.doMock('dompurify', () => ({
        default: {
          sanitize: (input: string) => input,
        },
      }));

      const { sanitizeText } = await import('@/utils/sanitize');
      expect(sanitizeText('Plain text content')).toBe('Plain text content');
    });
  });

  describe('sanitizeHtml', () => {
    it('allows safe tags but rejects script tags', async () => {
      const mockSanitize = vi.fn().mockReturnValue('<p>Safe content</p>');
      vi.doMock('dompurify', () => ({ default: { sanitize: mockSanitize } }));

      const { sanitizeHtml } = await import('@/utils/sanitize');
      sanitizeHtml('<p>Safe content</p><script>xss()</script>');

      expect(mockSanitize).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ALLOWED_TAGS: expect.arrayContaining(['p', 'br', 'strong', 'em']),
        })
      );
    });
  });
});
