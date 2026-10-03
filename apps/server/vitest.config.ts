import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    env: { NODE_ENV: 'test' },
    testTimeout: 20_000,
    hookTimeout: 120_000,
  },
});
