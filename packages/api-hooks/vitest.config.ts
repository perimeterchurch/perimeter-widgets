import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    // vitest 4: execArgv is top-level (poolOptions was removed in the pool rework).
    // Node's experimental webstorage global would otherwise shadow jsdom's
    // localStorage with undefined.
    execArgv: ['--no-experimental-webstorage'],
  },
});
