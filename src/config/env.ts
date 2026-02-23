import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url({ message: 'VITE_API_BASE_URL must be a valid URL' }),
  VITE_CDN_BASE_URL: z.string().url({ message: 'VITE_CDN_BASE_URL must be a valid URL' }),
  VITE_AUDIT_ENDPOINT: z
    .string()
    .url({ message: 'VITE_AUDIT_ENDPOINT must be a valid URL' })
    .optional(),
});

function validateEnv() {
  // Treat empty strings as undefined for optional vars
  const auditEndpoint = import.meta.env['VITE_AUDIT_ENDPOINT'];
  const result = envSchema.safeParse({
    VITE_API_BASE_URL: import.meta.env['VITE_API_BASE_URL'],
    VITE_CDN_BASE_URL: import.meta.env['VITE_CDN_BASE_URL'],
    VITE_AUDIT_ENDPOINT: auditEndpoint === '' ? undefined : auditEndpoint,
  });

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Missing or invalid environment variables:\n${errors}`);
  }

  return result.data;
}

export const env = validateEnv();
