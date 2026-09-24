import { test, expect } from '@playwright/test';
import {
  STUDIO_URL,
  SERMONS_TAB_URL,
  PREVIEW_HOST,
  mockSermonsApi,
  waitForShadowMount,
  waitForSermonCards,
  setWidgetTheme,
  luminance,
  snapshotPreview,
} from './helpers';

/**
 * Visual proof for the shared SegmentedTabs control. jsdom can't see rendered
 * color, so assert COMPUTED styles in a real browser, in BOTH light and dark:
 * the sermons tab row (shadow DOM, `underline` variant) must draw a visible
 * brand-blue bar under the active tab only — the old Tabs `line` underline
 * collapsed to no visible indicator — and the studio inspector tabs (light DOM,
 * default `segmented` variant) must lift the active segment.
 */

/** Computed style of a tab inside the widget shadow root, by accessible label. */
async function shadowTabStyle(
  page: import('@playwright/test').Page,
  label: string,
): Promise<{ bar: string; barWidth: string; hostBg: string }> {
  return page.evaluate(
    ({ hostSel, name }) => {
      const host = document.querySelector(hostSel) as HTMLElement | null;
      const root = host?.shadowRoot;
      const tab = root
        ?.querySelector('[role="tablist"]')
        ?.querySelectorAll<HTMLElement>('[role="tab"]');
      const match = tab && Array.from(tab).find((t) => (t.textContent ?? '').includes(name));
      if (!match) throw new Error(`shadow tab not found: ${name}`);
      const style = getComputedStyle(match);
      // The surface the bar sits on: the nearest opaque background, crossing
      // out of the shadow root to the host (and page) if needed.
      let el: Element | null = match;
      let surface = 'rgb(255, 255, 255)';
      while (el) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg !== 'transparent' && !bg.startsWith('rgba(0, 0, 0, 0')) {
          surface = bg;
          break;
        }
        el =
          el.parentElement ??
          ((el.getRootNode() as ShadowRoot).host as Element | undefined) ??
          null;
      }
      return { bar: style.borderBottomColor, barWidth: style.borderBottomWidth, hostBg: surface };
    },
    { hostSel: PREVIEW_HOST, name: label },
  );
}

test.describe('SegmentedTabs — sermons tab row (shadow DOM)', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(SERMONS_TAB_URL);
    await waitForShadowMount(page);
    await waitForSermonCards(page, 3);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`active tab carries a visible underline bar (${theme})`, async ({ page }) => {
      await setWidgetTheme(page, theme);
      await waitForSermonCards(page, 3);

      // "Sermons" is active (pinned via the URL); "Series" is inactive.
      const active = await shadowTabStyle(page, 'Sermons');
      const inactive = await shadowTabStyle(page, 'Series');

      expect(active.barWidth).toBe('2px');
      expect(
        active.bar,
        `active (${active.bar}) and inactive (${inactive.bar}) bars must differ in ${theme}`,
      ).not.toBe(inactive.bar);

      // The bar must stand off the widget surface in both themes — the failure
      // mode of the old line underline, which collapsed to no visible indicator.
      const gap = Math.abs(luminance(active.bar) - luminance(active.hostBg));
      expect(gap, `bar/surface luminance gap ${gap} too small in ${theme}`).toBeGreaterThan(0.1);

      await snapshotPreview(page, `segmented-sermons-${theme}`);
    });
  }
});

test.describe('SegmentedTabs — studio inspector tabs (light DOM)', () => {
  test('Config/Theme/Info tabs switch panels and mark the active tab', async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev`);
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
