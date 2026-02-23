import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.cjs',
        '**/types/*',
        'automation/**',
        'src/main.tsx',
        'src/App.tsx',
        'src/pages/admin/AdminMovieListPage.tsx',
        'src/pages/admin/AdminMovieFormPage.tsx',
        'src/pages/admin/AdminActorListPage.tsx',
        'src/components/NotFoundPage.tsx',
        'src/components/UnauthorizedPage.tsx',
        'src/components/SecurityHeaders.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/pages': path.resolve(__dirname, 'src/pages'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/context': path.resolve(__dirname, 'src/context'),
      '@/config': path.resolve(__dirname, 'src/config'),
    },
  },
});
