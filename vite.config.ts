/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        'src/test/**',
        'vite.config.ts',
        'eslint.config.js',
        'coverage/**',
        'outdated/**',
        'example/**',
        'lib/**',
      ],
    },
  },
});
