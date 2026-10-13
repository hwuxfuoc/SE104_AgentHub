import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ['tests/setup-database.ts'],
    fileParallelism: false,
    environment: 'node',
    testTimeout: 20000,
    include: ['tests/**/*.test.ts'],
  },
});

