import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each test file stores its data in its own temporary directory
    setupFiles: ['./tests/setup.ts'],
  },
});
