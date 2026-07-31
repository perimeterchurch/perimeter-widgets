import { test, expect } from '@playwright/test';
import {
  STUDIO_URL,
  PREVIEW_HOST,
  mockSermonsApi,
  waitForShadowMount,
  waitForSermonCards,
  setStudioTheme,
  readComputedColor,
  luminance,
  snapshotPreview,
} from './helpers';

/**
 * Computed-color proof for the "follow the studio chrome theme" fix. The studio
 * chrome (sidebar) toggle writes `data-theme` on <html>; both the component
 * gallery stage AND the widget-preview canvas must inherit it so switching the
 * studio to dark also darkens the previewed content. The chrome defaults to dark,
 * so the default-load state is exactly the reported bug: a `text-fg` Label that
 * used to render dark-on-dark (invisible) in the gallery, and a sermons widget
 * that stayed light under a dark studio. These reads only go green with the
 * ComponentStage data-theme mirror + the canvas previewTheme = state.theme ??
 * chromeTheme wiring. Distinct from smoke.spec, which drives the WIDGET (canvas)
 * toggle rather than the chrome toggle.
 */

/** Computed `color` of the first element matching `sel` inside ANY shadow host (the gallery stage host is a plain div, not the preview host). */
async function readGalleryColor(page: import('@playwright/test').Page, sel: string) {
  return page.evaluate((s) => {
    const host = [...document.querySelectorAll<HTMLElement>('div')].find((d) =>
      d.shadowRoot?.querySelector(s),
    );
    const el = host?.shadowRoot?.querySelector(s) as HTMLElement | null;
    if (!el) throw new Error(`no shadow host contains: ${s}`);
    return getComputedStyle(el).color;
  }, sel);
}

async function galleryStageThemed(page: import('@playwright/test').Page, sel: string) {
  return page.evaluate(
    (s) =>
      [...document.querySelectorAll<HTMLElement>('div')].some(
        (d) => d.shadowRoot?.querySelector(s) && d.getAttribute('data-theme') === 'dark',
      ),
    sel,
  );
}

test.describe('chrome theme drives the gallery stage + widget preview', () => {
  test('gallery: Label text is LIGHT under the (default) dark chrome, and follows a toggle to light', async ({
    page,
  }) => {
    await page.goto(`${STUDIO_URL}/components/label`);
    // The label.mdx Example mounts a <Label> inside a ComponentStage shadow root.
    await page.waitForFunction(
      () => [...document.querySelectorAll('div')].some((d) => d.shadowRoot?.querySelector('label')),
      undefined,
      { timeout: 20_000 },
    );

    // Default chrome is dark → the stage host must carry data-theme=dark so the
    // dark token block activates and `text-fg` resolves to a LIGHT color.
    await expect(async () => expect(await galleryStageThemed(page, 'label')).toBe(true)).toPass({
      timeout: 10_000,
    });
    const darkColor = await readGalleryColor(page, 'label');
    expect(
      luminance(darkColor),
      `label color ${darkColor} should be light on the dark stage`,
    ).toBeGreaterThan(0.5);

    // Toggle the chrome to light — the stage must FOLLOW: data-theme drops and the
    // label text returns to a dark color.
    await setStudioTheme(page, 'light');
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') !== 'dark',
      undefined,
      { timeout: 10_000 },
    );
    await expect(async () => {
      const c = await readGalleryColor(page, 'label');
      expect(luminance(c), `label color ${c} should be dark on the light stage`).toBeLessThan(0.5);
    }).toPass({ timeout: 10_000 });
  });

  test('sermons: the preview follows chrome dark with no canvas toggle', async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev`);
    await waitForShadowMount(page);
    await waitForSermonCards(page, 3);

    // Default chrome is dark and no theme is pinned in the URL → the preview host
    // inherits dark (previewTheme = state.theme ?? chromeTheme).
    await page.waitForFunction(
      (sel) => document.querySelector(sel)?.getAttribute('data-theme') === 'dark',
      PREVIEW_HOST,
      { timeout: 10_000 },
    );
    await waitForSermonCards(page, 3);
    const titleColor = await readComputedColor(page, '.grid button p.font-medium');
    expect(
      luminance(titleColor),
      `card title color ${titleColor} should be light under dark chrome`,
    ).toBeGreaterThan(0.5);
    await snapshotPreview(page, 'sermons-chrome-dark-follow');
  });
});
