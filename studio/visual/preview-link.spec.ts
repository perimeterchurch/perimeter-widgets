import { test, expect } from '@playwright/test';
import { STUDIO_URL, PREVIEW_HOST, mockSermonsApi, waitForShadowMount } from './helpers';

/**
 * The shareable preview link persists the canvas surface (`bg=`) and the widget
 * theme (`theme=`) in the URL. Opening such a link must hydrate BOTH — the canvas
 * paints the shared surface and the widget host carries `data-theme="dark"` —
 * verified against COMPUTED styles in a real browser (jsdom can't see either).
 */
test.describe('shareable preview link — surface + theme hydration', () => {
  test('a bg=dark&theme=dark link hydrates the dark surface and dark widget theme', async ({
    page,
  }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev&bg=dark&theme=dark`);
    await waitForShadowMount(page);

    // The widget host carries data-theme="dark" (drives :host([data-theme=dark])).
    const hostTheme = await page.locator(PREVIEW_HOST).getAttribute('data-theme');
    expect(hostTheme).toBe('dark');

    // The canvas surface paints the shared dark background (#1e1e1e), NOT the
    // host-sim default — a dark, non-white surface.
    const surfaceBg = await page.evaluate(() => {
      const el = document.querySelector('[data-canvas-surface]') as HTMLElement | null;
      return el ? getComputedStyle(el).backgroundColor : null;
    });
    expect(surfaceBg).not.toBeNull();
    const rgb = surfaceBg!.match(/\d+/g)!.map(Number);
    // #1e1e1e ≈ rgb(30,30,30): a dark surface (each channel well below mid-gray).
    expect(Math.max(rgb[0], rgb[1], rgb[2])).toBeLessThan(80);

    // The Surface segmented control reflects the hydrated selection (Dark pressed).
    const surfaceGroup = page.getByRole('group', { name: 'Canvas surface' });
    await expect(surfaceGroup.getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
