/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@simpreact/core': path.resolve(process.cwd(), './src/main/core'),
      '@simpreact/internal': path.resolve(process.cwd(), './src/main/core/internal.ts'),
      '@simpreact/dom': path.resolve(process.cwd(), './src/main/dom'),
      '@simpreact/hooks': path.resolve(process.cwd(), './src/main/hooks'),
      '@simpreact/jsx-runtime': path.resolve(process.cwd(), './src/main/hooks'),
      '@simpreact/shared': path.resolve(process.cwd(), './src/main/shared'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        'src/test/**',
        'vite.config.ts',
        'eslint.config.js',
        'move-types.mjs',
        'coverage/**',
        'outdated/**',
        'example/**',
        'example2/**',
        'lib/**',
      ],
    },
  },
});
