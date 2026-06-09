import { test, expect } from '@playwright/test';
import {
  STUDIO_URL,
  mockSermonsApi,
  waitForShadowMount,
  waitForSermonCards,
  setWidgetTheme,
  readComputedColor,
  shadowCount,
  openShadowMenu,
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
    // can't reach it). The trigger is the first button inside results-toolbar; its
    // popup is the `w-48` variant (the view/icon-select popup is `w-44`).
    await openShadowMenu(page, '[data-slot="results-toolbar"] button', '.absolute.z-50.w-48');

    // The option <button> text color must be light on the dark popup background —
    // this is the dark-on-dark dropdown bug (Task 3). Read the first option label.
    const optionColor = await readComputedColor(page, '.absolute.z-50.w-48 button span.flex-1');
    expect(
      luminance(optionColor),
      `sort option text color ${optionColor} should be light on dark`,
    ).toBeGreaterThan(0.5);

    await snapshotPreview(page, 'sermons-dark-sort-open');
  });

  test('dark theme: view dropdown (icon-select) option text is LIGHT', async ({ page }) => {
    await setWidgetTheme(page, 'dark');
    await waitForSermonCards(page, 3);

    // The View control is the IconSelect — the LAST trigger button in the
    // results-toolbar control group. Its popup is the `w-44` variant (the Sort
    // popup is `w-48`), so we can target it unambiguously inside the shadow root.
    await openShadowMenu(
      page,
      '[data-slot="results-toolbar"] .relative:last-child > button',
      '.absolute.z-50.w-44',
    );

    // Option label text must read light on the dark popup background.
    const optionColor = await readComputedColor(page, '.absolute.z-50.w-44 button span.flex-1');
    expect(
      luminance(optionColor),
      `view option text color ${optionColor} should be light on dark`,
    ).toBeGreaterThan(0.5);

    await snapshotPreview(page, 'sermons-dark-view-open');
  });
});
