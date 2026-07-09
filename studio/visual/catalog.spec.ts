import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STUDIO_URL, mockCdn, mockSermonsApi } from './helpers';

test.describe('catalog', () => {
  test('landing lists released widgets with auth badges (axe clean)', async ({ page }) => {
    await mockCdn(page);
    await page.goto(`${STUDIO_URL}/catalog`);
    await expect(page.getByRole('link', { name: /sermons/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /my shepherds/i })).toBeVisible();
    await expect(page.getByText('Sign-in required')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    // The pinned fixture manifest (9.9.9/9.9.8) exists exactly so this baseline
    // never churns with releases. Absolute maxDiffPixels per repo convention.
    await expect(page).toHaveScreenshot('catalog-landing.png', { maxDiffPixels: 100 });
  });

  test('viewer runs the shipped sermons bundle hermetically', async ({ page }) => {
    await mockCdn(page);
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/catalog/sermons`);
    // Snippet present with the loader form.
    await expect(page.getByText('data-perimeter-widget="sermons"').first()).toBeVisible();
    // The shipped bundle actually MOUNTED and rendered fixture data: Playwright
    // pierces the open shadow root (mount.tsx uses { mode: 'open' }), so assert
    // real content — a sermon title from studio/visual/fixtures/sermons.ts.
    const frame = page.frameLocator('iframe[title="Live widget: sermons"]');
    await expect(frame.getByText('The Weight of Glory')).toBeVisible();
  });

  test('auth viewer shows the sign-in panel and the embedded gate', async ({ page }) => {
    await mockCdn(page);
    await page.goto(`${STUDIO_URL}/catalog/my-shepherds`);
    await expect(page.getByRole('region', { name: /sign-in status/i })).toBeVisible();
    const frame = page.frameLocator('iframe[title="Live widget: my-shepherds"]');
    await expect(frame.getByText(/please sign in/i)).toBeVisible();
  });
});
