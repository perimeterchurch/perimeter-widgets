import { test, expect } from '@playwright/test';
import {
  STUDIO_URL,
  PREVIEW_HOST,
  mockSermonsApi,
  waitForShadowMount,
  waitForSermonCards,
  setWidgetTheme,
  luminance,
  snapshotPreview,
} from './helpers';

/**
 * Visual proof for the shared SegmentedTabs control (Task 4). jsdom can't see
 * rendered color, so assert COMPUTED backgrounds in a real browser: the active
 * segment must read distinctly from an inactive one (lifted `bg-bg` over the
 * `bg-muted` track) in BOTH light and dark — the failure mode the old line
 * underline had. Covers the sermons tab row (shadow DOM) and the studio
 * inspector tabs (light DOM) so both consumers are verified.
 */

/** Computed background of a tab inside the widget shadow root, by accessible label. */
async function shadowTabBg(page: import('@playwright/test').Page, label: string): Promise<string> {
  return page.evaluate(
    ({ hostSel, name }) => {
      const host = document.querySelector(hostSel) as HTMLElement | null;
      const root = host?.shadowRoot;
      const tab = root
        ?.querySelector('[role="tablist"]')
        ?.querySelectorAll<HTMLElement>('[role="tab"]');
      const match = tab && Array.from(tab).find((t) => (t.textContent ?? '').includes(name));
      if (!match) throw new Error(`shadow tab not found: ${name}`);
      return getComputedStyle(match).backgroundColor;
    },
    { hostSel: PREVIEW_HOST, name: label },
  );
}

test.describe('SegmentedTabs — sermons tab row (shadow DOM)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons`);
    await waitForShadowMount(page);
    await waitForSermonCards(page, 3);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`active segment background differs from inactive (${theme})`, async ({ page }) => {
      await setWidgetTheme(page, theme);
      await waitForSermonCards(page, 3);

      // "Sermons" is the default-active tab; "Series" is inactive.
      const activeBg = await shadowTabBg(page, 'Sermons');
      const inactiveBg = await shadowTabBg(page, 'Series');

      expect(
        activeBg,
        `active (${activeBg}) and inactive (${inactiveBg}) segment backgrounds must differ in ${theme}`,
      ).not.toBe(inactiveBg);

      // The lifted active segment (bg-bg) sits over the muted track behind the
      // inactive tab; the gap is wider in light than dark, but must be a real,
      // non-zero separation in both (the failure mode of the old line underline,
      // which collapsed to no visible indicator).
      const gap = Math.abs(luminance(activeBg) - luminance(inactiveBg));
      expect(gap, `luminance gap ${gap} too small in ${theme}`).toBeGreaterThan(0.005);

      await snapshotPreview(page, `segmented-sermons-${theme}`);
    });
  }
});

test.describe('SegmentedTabs — studio inspector tabs (light DOM)', () => {
  test('Config/Theme/Info tabs switch panels and mark the active tab', async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons`);
    await waitForShadowMount(page);

    // The inspector lives in a drawer; open it before the tablist exists.
    await page.getByRole('button', { name: 'Inspector', exact: true }).click();

    const tablist = page.getByRole('tablist', { name: 'Inspector sections' });
    await expect(tablist).toBeVisible();

    const config = tablist.getByRole('tab', { name: 'Config' });
    const theme = tablist.getByRole('tab', { name: 'Theme' });

    await expect(config).toHaveAttribute('aria-selected', 'true');
    await expect(theme).toHaveAttribute('aria-selected', 'false');

    // The active segment is lifted with bg-bg; the inactive sits on the muted
    // track — their computed backgrounds must differ.
    const activeBg = await config.evaluate((el) => getComputedStyle(el).backgroundColor);
    const inactiveBg = await theme.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(activeBg).not.toBe(inactiveBg);

    await theme.click();
    await expect(theme).toHaveAttribute('aria-selected', 'true');
    await expect(config).toHaveAttribute('aria-selected', 'false');
  });
});
