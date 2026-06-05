import { test, expect } from '@playwright/test';
import {
  STUDIO_URL,
  mockSermonsApi,
  waitForShadowMount,
  waitForSermonCards,
  setWidgetTheme,
  readComputedColor,
  shadowCount,
  clickInShadow,
  luminance,
  snapshotPreview,
} from './helpers';

/**
 * Smoke proof that the harness works: launch the real studio, mock the sermons
 * API, mount the sermons widget in its shadow root, and assert COMPUTED colors —
 * the thing jsdom/happy-dom can't see. Assertions encode the CORRECT post-fix
 * behavior (dropdown option text is LIGHT on dark); they go green once Task 3
 * adds `text-fg` to the sort/icon-select popups.
 */
test.describe('studio visual harness — sermons', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons`);
    await waitForShadowMount(page);
    // The shadow root mounts before the mocked query resolves — wait for the
    // cards so theme toggles + computed-color reads don't race the data mount.
    await waitForSermonCards(page, 3);
  });

  test('renders sermon cards from the mocked API', async ({ page }) => {
    // MediaCard grid view renders a clickable button per sermon; the fixture has 3.
    const cards = await shadowCount(page, '.grid button');
    expect(cards).toBeGreaterThanOrEqual(3);
    await snapshotPreview(page, 'sermons-light');
  });

  test('dark theme: card title and sort-dropdown option text are LIGHT', async ({ page }) => {
    await setWidgetTheme(page, 'dark');
    // Toggling the host's data-theme can remount the preview; re-settle the cards.
    await waitForSermonCards(page, 3);

    // Card title (a font-medium <p> inside a grid card) must read light on dark.
    const titleColor = await readComputedColor(page, '.grid button p.font-medium');
    expect(luminance(titleColor), `card title color ${titleColor} should be light`).toBeGreaterThan(
      0.5,
    );

    // Open the Sort dropdown (rendered inside the shadow root — light-DOM locators
    // can't reach it). The trigger is the first button inside results-toolbar.
    await clickInShadow(page, '[data-slot="results-toolbar"] button');
    // The popup is absolutely-positioned with z-50 + rounded-lg bg-bg.
    await page.waitForFunction(
      () => {
        const host = document.querySelector('[data-perimeter-widget-preview]') as HTMLElement;
        return !!host?.shadowRoot?.querySelector('.absolute.z-50');
      },
      undefined,
      { timeout: 5000 },
    );

    // The option <button> text color must be light on the dark popup background —
    // this is the dark-on-dark dropdown bug (Task 3). Read the first option label.
    const optionColor = await readComputedColor(page, '.absolute.z-50 button span.flex-1');
    expect(
      luminance(optionColor),
      `sort option text color ${optionColor} should be light on dark`,
    ).toBeGreaterThan(0.5);

    await snapshotPreview(page, 'sermons-dark-sort-open');
  });
});
