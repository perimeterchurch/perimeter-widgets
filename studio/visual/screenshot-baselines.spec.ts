import { test, expect, type Page } from '@playwright/test';
import {
  STUDIO_URL,
  PREVIEW_HOST,
  mockSermonsApi,
  waitForShadowMount,
  waitForResultsLoaded,
  setWidgetTheme,
} from './helpers';

/**
 * Pixel-baseline regression guard (visual-regression spike, decision record:
 * docs/superpowers/decisions/2026-06-11-visual-regression.md). The rest of the
 * harness asserts COMPUTED styles — precise but blind to anything it doesn't
 * explicitly read (layout shifts, paint regressions, token changes on
 * unasserted elements). `toHaveScreenshot` diffs the full rendered widget
 * against a committed baseline, catching what assertions miss.
 *
 * Baselines are generated on the dev Mac and keyed per platform
 * (`*-darwin.png`); the visual suite runs locally only (CI runs `pnpm quality`,
 * not Playwright), so no Linux baselines exist. If this suite ever moves to
 * CI, baselines must be regenerated there (Docker) or hosted (Argos — see the
 * decision record's re-evaluation trigger). Update intentionally-changed
 * baselines with:
 *   pnpm --filter @perimeter/studio visual -- --update-snapshots
 *
 * Flake guards (the documented visual-suite flake class): mocked API + tiny
 * deterministic PNG, fonts awaited, framer-motion entrance fades settled
 * before capture, CSS animations disabled by the assertion itself.
 *
 * Tolerance is an ABSOLUTE pixel budget, never a ratio: the spike's
 * perturbation proof (italicizing every card title — clearly visible) moved
 * only ~400 pixels past the per-pixel color threshold, so a plausible-looking
 * maxDiffPixelRatio of 0.001 (~2,300 px of this capture) silently swallowed
 * it. 100 px catches that class of regression while leaving headroom for
 * same-machine render noise (runs were pixel-identical across 6 consecutive
 * passes when this was committed).
 */

/** Settle: fonts loaded and no framer-motion fade mid-flight in the shadow root. */
async function waitForStablePaint(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(
    (sel) => {
      const root = (document.querySelector(sel) as HTMLElement | null)?.shadowRoot;
      if (!root) return false;
      // framer-motion drives fades via inline style.opacity; settled = none < 1.
      const animating = root.querySelectorAll<HTMLElement>('[style*="opacity"]');
      for (const el of animating) {
        const o = getComputedStyle(el).opacity;
        if (o !== '' && Number(o) < 1) return false;
      }
      return true;
    },
    PREVIEW_HOST,
    { timeout: 15_000 },
  );
}

test.describe('sermons pixel baselines', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev`);
    await waitForShadowMount(page);
    await waitForResultsLoaded(page);
  });

  test('light theme matches the committed baseline', async ({ page }) => {
    await setWidgetTheme(page, 'light');
    await waitForResultsLoaded(page);
    await waitForStablePaint(page);
    await expect(page.locator(PREVIEW_HOST)).toHaveScreenshot('sermons-light.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });

  test('dark theme matches the committed baseline', async ({ page }) => {
    await setWidgetTheme(page, 'dark');
    await waitForResultsLoaded(page);
    await waitForStablePaint(page);
    await expect(page.locator(PREVIEW_HOST)).toHaveScreenshot('sermons-dark.png', {
      animations: 'disabled',
      maxDiffPixels: 100,
    });
  });
});
