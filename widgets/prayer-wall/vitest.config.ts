import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    // Node's built-in webstorage global otherwise shadows jsdom's localStorage
    // with undefined when no --localstorage-file is configured.
    execArgv: ['--no-experimental-webstorage'],
  },
});
