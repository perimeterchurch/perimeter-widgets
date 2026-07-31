import { test, expect, type Page } from '@playwright/test';
import {
  STUDIO_URL,
  PREVIEW_HOST,
  mockSermonsApi,
  waitForShadowMount,
  waitForResultsLoaded,
  setWidgetTheme,
  luminance,
  snapshotPreview,
} from './helpers';

/**
 * Computed-color proof that the shadow HOST is a real themed SURFACE, not just
 * a variable bag (the 2026-06-10 sermons dark-mode bug). The token sheet's
 * `:host` block must paint `background-color: var(--color-bg)`, reset the
 * host-inherited `color` to `var(--color-fg)`, normalize `font-size` (the
 * host-sim canvas inherits 19px through the shadow boundary), and declare
 * `color-scheme` per theme. Without it, dark mode rendered dark-token elements
 * over the host page's light backdrop with the host's dark text — filters,
 * background, and active controls all inconsistent.
 *
 * The canvas surface defaults to host-sim (HostFrame simulates the measured
 * production host: 19px / line-height 35px / color #353535), which is exactly
 * the inheritance these reads must prove is reset.
 */

interface HostSurface {
  background: string;
  color: string;
  fontSize: string;
  colorScheme: string;
}

async function readHostSurface(page: Page): Promise<HostSurface> {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel) as HTMLElement | null;
    if (!host) throw new Error(`no host: ${sel}`);
    const cs = getComputedStyle(host);
    return {
      background: cs.backgroundColor,
      color: cs.color,
      fontSize: cs.fontSize,
      colorScheme: cs.colorScheme,
    };
  }, PREVIEW_HOST);
}

test.describe('the shadow host paints a themed surface', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev`);
    await waitForShadowMount(page);
    await waitForResultsLoaded(page);
  });

  test('light: opaque light background, dark foreground, normalized type', async ({ page }) => {
    await setWidgetTheme(page, 'light');
    const s = await readHostSurface(page);
    expect(s.background, 'host must paint an opaque background').not.toMatch(/rgba\(0, 0, 0, 0\)/);
    expect(luminance(s.background), `light surface too dark: ${s.background}`).toBeGreaterThan(0.8);
    expect(luminance(s.color), `light foreground too light: ${s.color}`).toBeLessThan(0.2);
    expect(s.fontSize, 'host-sim 19px must not leak into the widget').toBe('16px');
    expect(s.colorScheme).toBe('light');
    await snapshotPreview(page, 'host-surface-light');
  });

  test('dark: opaque dark background, light foreground, dark color-scheme', async ({ page }) => {
    await setWidgetTheme(page, 'dark');
    const s = await readHostSurface(page);
    expect(s.background, 'host must paint an opaque background').not.toMatch(/rgba\(0, 0, 0, 0\)/);
    expect(luminance(s.background), `dark surface too light: ${s.background}`).toBeLessThan(0.1);
    expect(luminance(s.color), `dark foreground too dark: ${s.color}`).toBeGreaterThan(0.7);
    expect(s.fontSize, 'host-sim 19px must not leak into the widget').toBe('16px');
    expect(s.colorScheme).toBe('dark');
    await snapshotPreview(page, 'host-surface-dark');
  });
});
