import { defineConfig } from '@playwright/test';

/**
 * Studio visual-verification harness. The studio runs jsdom/happy-dom in vitest,
 * so unit tests can't see real layout/color/`prefers-color-scheme` — this
 * Playwright config launches the actual Vite studio in a real browser so theming,
 * dropdown text color, loading states, contrast, and alignment can be asserted
 * against COMPUTED styles + screenshots.
 *
 * Copied from `packages/parity/playwright.config.ts` (the proven pattern): same
 * `webServer` running the studio dev server with `reuseExistingServer`, the same
 * shadow-ready wait approach lives in `visual/helpers.ts`. The studio sets no
 * `server.port`, so `--port 5173 --strictPort` pins it (no silent port drift).
 */
export default defineConfig({
  testDir: './visual',
  timeout: 90_000,
  use: { viewport: { width: 1280, height: 2000 }, deviceScaleFactor: 1 },
  webServer: {
    command: 'pnpm --filter @perimeter/studio dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    cwd: '../..',
    timeout: 60_000,
  },
});
