import { test, expect, type Page } from '@playwright/test';
import { STUDIO_URL, mockSermonsApi, waitForShadowMount, waitForSermonCards } from './helpers';

/**
 * Responsive overhaul verification. Drives the studio viewport presets (which,
 * after the HostFrame gutter ramp, yield realistic widget widths) and asserts the
 * widget's container-query + breakpoint behavior end to end:
 *   - Mobile preset → ~343px container (phone): compact `list` default, filters
 *     collapsed behind the Filters toggle, Sort/View labels compacted, no overflow.
 *   - Tablet preset → ~702px (tablet): 2-col grid, inline filters, full labels.
 *   - Desktop preset → ~1100px (desktop): 3-col grid.
 * The date-range modal is intentionally not asserted here — it is a viewport-fixed
 * overlay (escapes the frame to the test viewport), so the studio harness can't
 * exercise the narrow-container case; it is verify-only per the spec (already
 * w-full/max-w-capped, fits a phone).
 */

const PREVIEW = '[data-perimeter-widget-preview]';

async function selectPreset(page: Page, name: 'Mobile' | 'Tablet' | 'Desktop') {
  await page
    .getByRole('group', { name: 'Viewport width presets' })
    .getByRole('button', { name, exact: true })
    .click();
}

/** Read facts about the widget's rendered state from inside its shadow root. */
async function widgetState(page: Page) {
  return page.evaluate((host) => {
    const sr = (document.querySelector(host) as HTMLElement | null)?.shadowRoot;
    const container = sr?.querySelector('[class~="@container"]') as HTMLElement | null;
    const grid = sr?.querySelector('div.grid.gap-4') as HTMLElement | null; // SermonGrid only
    const toolbar = sr?.querySelector('[data-slot="results-toolbar"]') as HTMLElement | null;
    const gridCols = grid
      ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
      : 0;
    return {
      containerWidth: container?.clientWidth ?? 0,
      overflow: container ? container.scrollWidth > container.clientWidth + 1 : false,
      hasGrid: !!grid,
      gridCols,
      toolbarText: toolbar?.textContent ?? '',
      // The Filters collapse toggle (phone only). Its accessible text is "Filters".
      hasFiltersToggle: [...(sr?.querySelectorAll('button') ?? [])].some((b) =>
        /^\s*Filters/.test(b.textContent ?? ''),
      ),
      hasMultiCombobox: !!sr?.querySelector('[data-slot="multi-combobox"]'),
    };
  }, PREVIEW);
}

test.describe('sermons responsive overhaul', () => {
  test.beforeEach(async ({ page }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons`);
    await waitForShadowMount(page);
    // Default viewport is fluid (wide) → desktop → grid; cards settle here before
    // we switch presets (switching the preset changes the view branch).
    await waitForSermonCards(page, 3);
  });

  test('studio presets yield realistic widget widths (HostFrame gutter ramp)', async ({ page }) => {
    // Poll each preset's full width BAND as one predicate. The width starts at
    // ~796 (fluid/desktop), so a lower-bound-only poll is satisfied BEFORE the
    // preset click applies, and the one-shot upper bound then raced the resize
    // (observed under full-suite load: 'mobile container' read 796).
    const widthInBand = (lo: number, hi: number) => async () => {
      const w = (await widgetState(page)).containerWidth;
      return w >= lo && w < hi;
    };

    await selectPreset(page, 'Mobile');
    await expect
      .poll(widthInBand(321, 480), { message: 'mobile container in [321, 480)', timeout: 10_000 })
      .toBe(true);

    await selectPreset(page, 'Tablet');
    await expect
      .poll(widthInBand(480, 768), { message: 'tablet container in [480, 768)', timeout: 10_000 })
      .toBe(true);

    await selectPreset(page, 'Desktop');
    await expect
      .poll(async () => (await widgetState(page)).containerWidth, { timeout: 10_000 })
      .toBeGreaterThanOrEqual(768);
  });

  test('phone: compact list default, collapsed filters, compact labels, no overflow', async ({
    page,
  }) => {
    await selectPreset(page, 'Mobile');
    // Wait for the breakpoint→list re-render (grid container disappears).
    await expect
      .poll(async () => (await widgetState(page)).hasGrid, { timeout: 10_000 })
      .toBe(false);
    const s = await widgetState(page);

    expect(s.containerWidth, 'phone width').toBeLessThan(480);
    expect(s.hasGrid, 'no SermonGrid on phone (list default)').toBe(false);
    expect(s.overflow, 'no horizontal overflow on phone').toBe(false);
    // Filters collapsed: the toggle is present and the dropdowns are not rendered.
    expect(s.hasFiltersToggle, 'Filters toggle present on phone').toBe(true);
    expect(s.hasMultiCombobox, 'filter dropdowns collapsed (absent) on phone').toBe(false);
    // Compact toolbar: no verbose prefixes.
    expect(s.toolbarText).not.toContain('Sort by:');
    expect(s.toolbarText).not.toContain('View:');
  });

  test('tablet: 2-col grid, inline filters, full labels, no overflow', async ({ page }) => {
    await selectPreset(page, 'Tablet');
    await expect
      .poll(async () => (await widgetState(page)).hasGrid, { timeout: 10_000 })
      .toBe(true);
    await expect.poll(async () => (await widgetState(page)).gridCols, { timeout: 10_000 }).toBe(2);
    // The breakpoint hook re-renders the filter row a beat after the grid
    // settles (ResizeObserver tick), and the preview can transiently REMOUNT
    // after that (observed under full-suite load: toolbarText polled to
    // 'Sort by: …' and then read '' again at a one-shot snapshot). Poll the
    // whole settled state as ONE atomic predicate — any transient remount just
    // retries; the diagnostic string names whichever check was still unsettled.
    await expect
      .poll(
        async () => {
          const s = await widgetState(page);
          if (!s.hasMultiCombobox) return 'filter dropdowns (multi-combobox) absent';
          if (s.overflow) return `horizontal overflow at width ${s.containerWidth}`;
          if (s.hasFiltersToggle) return 'Filters toggle present (filters should be inline)';
          if (!s.toolbarText.includes('Sort by:')) return `toolbar: "${s.toolbarText}"`;
          if (!s.toolbarText.includes('View:')) return `toolbar: "${s.toolbarText}"`;
          return 'settled';
        },
        { message: 'tablet layout settled', timeout: 10_000 },
      )
      .toBe('settled');
  });

  test('desktop: 3-col grid, no overflow', async ({ page }) => {
    await selectPreset(page, 'Desktop');
    await expect.poll(async () => (await widgetState(page)).gridCols, { timeout: 10_000 }).toBe(3);
    const s = await widgetState(page);
    expect(s.overflow, 'no overflow on desktop').toBe(false);
    expect(s.hasFiltersToggle, 'no Filters toggle on desktop').toBe(false);
  });
});
