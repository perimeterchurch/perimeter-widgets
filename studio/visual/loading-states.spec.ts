import { test, expect, type Page } from '@playwright/test';
import {
  STUDIO_URL,
  mockSermonsApi,
  waitForShadowMount,
  waitForResultsLoaded,
  shadowCount,
  shadowAttr,
  snapshotPreview,
} from './helpers';

/**
 * Visual proof of the viewMode-aware loading skeletons (Task 7). The list mock
 * is DELAYED so the loading state is actually observable in a real browser
 * (jsdom can't render layout). For each viewMode we:
 *   1. observe the SermonSkeleton wrapper while the query is in-flight, and
 *      assert its container shape matches that viewMode (grid → .grid with the
 *      @[…] cols; list/large → non-grid stack), with placeholder items;
 *   2. let the mock resolve and assert the LOADED region renders cards — so the
 *      results region transitions from skeleton to content without a shape jump
 *      (the skeleton wrapper class encodes the same container the view uses).
 *
 * The `view` is driven by the widget's nuqs query param (`sermons-view`), which
 * the studio reads from the page URL (the deeplink path the widget already uses).
 */

const SKELETON = '[data-slot="sermon-skeleton"]';
const SKELETON_ITEM = '[data-slot="sermon-skeleton-item"]';

/** Wait until the loading skeleton wrapper is present in the shadow root. */
async function waitForSkeleton(page: Page) {
  await page.waitForFunction(
    (sel) => {
      const host = document.querySelector('[data-perimeter-widget-preview]') as HTMLElement | null;
      return !!host?.shadowRoot?.querySelector(sel);
    },
    SKELETON,
    { timeout: 10_000 },
  );
}

test.describe('sermons loading skeletons — viewMode-aware', () => {
  for (const { view, expectGrid, label } of [
    { view: 'grid', expectGrid: true, label: 'grid' },
    { view: 'list', expectGrid: false, label: 'list' },
    { view: 'large', expectGrid: false, label: 'large' },
  ] as const) {
    test(`${label}: loading skeleton matches the ${label} layout, then loads cards`, async ({
      page,
    }) => {
      // Hold the list query in-flight ~1.5s so the skeleton is observable.
      await mockSermonsApi(page, { listDelayMs: 1500 });
      await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev&sermons-view=${view}`);
      await waitForShadowMount(page);

      // 1. Loading state: the skeleton wrapper exists with the viewMode shape.
      await waitForSkeleton(page);
      const skClass = await shadowAttr(page, SKELETON, 'class');
      expect(skClass, `skeleton class for ${label}`).not.toBeNull();
      if (expectGrid) {
        // grid skeleton mirrors the responsive container-query grid.
        expect(skClass).toContain('grid');
        expect(skClass).toContain('@[48rem]:grid-cols-3');
      } else {
        // list/large skeletons are stacked, never the responsive grid.
        expect(skClass).not.toMatch(/\bgrid\b/);
      }
      const items = await shadowCount(page, SKELETON_ITEM);
      expect(items, `skeleton items for ${label}`).toBeGreaterThanOrEqual(1);
      await snapshotPreview(page, `sermons-loading-${label}`);

      // 2. Loaded state: the delayed mock resolves → skeleton gone, cards in.
      await waitForResultsLoaded(page);
      const cardImgs = await shadowCount(page, 'img');
      expect(cardImgs, `loaded card images for ${label}`).toBeGreaterThanOrEqual(1);
      // The skeleton wrapper is gone once content arrives (no lingering shape).
      const skeletonGone = await shadowCount(page, SKELETON);
      expect(skeletonGone, 'skeleton removed after load').toBe(0);
      await snapshotPreview(page, `sermons-loaded-${label}`);
    });
  }

  test('per-image: thumbnail shows a Skeleton over the not-yet-loaded <img>', async ({ page }) => {
    // Resolve the list fast but DELAY the image ~3s so the per-image blur-up
    // Skeleton (MediaCard FallbackImage) is observable before <img> onLoad.
    await mockSermonsApi(page, { imageDelayMs: 3000 });
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev&sermons-view=grid`);
    await waitForShadowMount(page);

    // While the image request is in-flight, each card's FallbackImage renders an
    // absolutely-positioned Skeleton (animate-pulse) over the not-yet-loaded img.
    // Poll for it (it appears once cards render but before the delayed image
    // resolves) rather than a single race-prone read.
    await page.waitForFunction(
      () => {
        const host = document.querySelector(
          '[data-perimeter-widget-preview]',
        ) as HTMLElement | null;
        return (
          (host?.shadowRoot?.querySelectorAll('.grid button .animate-pulse.absolute').length ??
            0) >= 1
        );
      },
      undefined,
      { timeout: 10_000 },
    );
    const skeletonsOverImages = await shadowCount(page, '.grid button .animate-pulse.absolute');
    expect(skeletonsOverImages, 'per-image skeletons present pre-load').toBeGreaterThanOrEqual(1);
    await snapshotPreview(page, 'sermons-image-loading');

    // Once the image resolves, the Skeleton clears and the faded-in <img> remains.
    await page.waitForFunction(
      () => {
        const host = document.querySelector(
          '[data-perimeter-widget-preview]',
        ) as HTMLElement | null;
        const root = host?.shadowRoot;
        const skeletons =
          root?.querySelectorAll('.grid button .animate-pulse.absolute').length ?? 0;
        const imgs = root?.querySelectorAll('.grid button img').length ?? 0;
        return skeletons === 0 && imgs >= 1;
      },
      undefined,
      { timeout: 10_000 },
    );
    const imgs = await shadowCount(page, '.grid button img');
    expect(imgs, 'real imgs after load').toBeGreaterThanOrEqual(1);
    await snapshotPreview(page, 'sermons-image-loaded');
  });
});
