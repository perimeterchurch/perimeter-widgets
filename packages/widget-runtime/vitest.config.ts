import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    poolOptions: {
      threads: { execArgv: ['--no-experimental-webstorage'] },
      forks: { execArgv: ['--no-experimental-webstorage'] },
    },
  },
});
