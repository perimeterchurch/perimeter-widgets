import { test, expect } from '@playwright/test';
import { STUDIO_URL, mockSermonsApi, waitForShadowMount, SCREENSHOT_DIR } from './helpers';
import { mkdirSync } from 'node:fs';

/**
 * Visual proof for the Config-tab field alignment (Task 5). jsdom can't measure
 * layout, so the unit test can only assert the grid classes — it can't prove the
 * controls actually line up. Here, in a real browser, open the inspector's
 * Config tab (the sermons schema renders string text inputs like `apiUrl`, enum
 * `<select>`s like `defaultTab`/`defaultView`, and boolean `hide*` checkboxes)
 * and assert the full-width text/select controls share the same left edge, right
 * edge, AND height, and that a boolean checkbox starts at that same left edge
 * (left-aligned in the control column via justify-self-start, not stretched and
 * not floating).
 */

/** Bounding boxes of the inspector Config controls, keyed for legible failures. */
async function controlBox(
  tab: import('@playwright/test').Locator,
): Promise<{ x: number; right: number; height: number }> {
  const box = await tab.boundingBox();
  if (!box) throw new Error('control has no bounding box');
  return { x: box.x, right: box.x + box.width, height: box.height };
}

test.describe('ConfigPanel — field alignment (light DOM inspector)', () => {
  test('text/select controls share a left edge and height; checkbox left-aligns', async ({
    page,
  }) => {
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/widgets/sermons`);
    await waitForShadowMount(page);

    // The inspector lives in a drawer; open it. Config is the default tab.
    await page.getByRole('button', { name: 'Inspector', exact: true }).click();
    const tablist = page.getByRole('tablist', { name: 'Inspector sections' });
    await expect(tablist).toBeVisible();
    await expect(tablist.getByRole('tab', { name: 'Config' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // The Config panel is a tabpanel of <label> rows. Grab a text input, a
    // <select>, and a checkbox — the three control shapes the panel renders.
    const panel = page.getByRole('tabpanel');
    const textBox = panel.getByRole('textbox').first(); // string field
    const selectBox = panel.getByRole('combobox').first(); // enum field
    const checkBox = panel.getByRole('checkbox').first(); // boolean field

    await expect(textBox).toBeVisible();
    await expect(selectBox).toBeVisible();
    await expect(checkBox).toBeVisible();

    const text = await controlBox(textBox);
    const select = await controlBox(selectBox);
    const check = await controlBox(checkBox);

    // Left edges of the full-width controls align within sub-pixel rounding.
    expect(Math.abs(text.x - select.x), `text.x ${text.x} vs select.x ${select.x}`).toBeLessThan(
      1.5,
    );
    // The checkbox left-aligns to the SAME control-column edge (justify-self-start),
    // not floating elsewhere.
    expect(Math.abs(text.x - check.x), `text.x ${text.x} vs checkbox.x ${check.x}`).toBeLessThan(
      1.5,
    );

    // Full-width controls also share a right edge (w-full fills the column).
    expect(
      Math.abs(text.right - select.right),
      `text.right ${text.right} vs select.right ${select.right}`,
    ).toBeLessThan(1.5);

    // Uniform h-9 height across the text + select controls.
    expect(
      Math.abs(text.height - select.height),
      `text.h ${text.height} vs select.h ${select.height}`,
    ).toBeLessThan(1.5);
    // The checkbox keeps its intrinsic (smaller) size — it is NOT stretched to h-9.
    expect(check.height, `checkbox height ${check.height} should be < control height`).toBeLessThan(
      text.height,
    );

    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await panel.screenshot({ path: `${SCREENSHOT_DIR}/config-panel-alignment.png` });
  });
});
