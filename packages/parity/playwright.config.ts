import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './visual',
  timeout: 90_000,
  use: { viewport: { width: 1280, height: 2000 }, deviceScaleFactor: 1 },
  webServer: [
    {
      command: 'pnpm --filter @perimeter/studio dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      cwd: '../..',
      timeout: 60_000,
    },
    {
      command: 'pnpm exec tsx src/serve-fixture.ts',
      url: 'http://localhost:4173/manifest.json',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
