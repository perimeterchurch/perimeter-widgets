import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const WIDGETS = ['example', 'sermons'];
mkdirSync('reports', { recursive: true });

// pixelmatch requires both inputs to share the output's dimensions. Studio and
// fixture screenshots differ in size (the width gap is itself a finding), so
// crop each to the common top-left box before diffing.
function crop(src: PNG, width: number, height: number): PNG {
  const out = new PNG({ width, height });
  PNG.bitblt(src, out, 0, 0, width, height, 0, 0);
  return out;
}

for (const name of WIDGETS) {
  test(`visual parity: ${name}`, async ({ page }) => {
    // Studio side: select the widget in the current UI (no routes yet — click the
    // sidebar button), wait for the shadow-root mount to settle.
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name, exact: true }).click();
    const studioHost = page.locator('[data-perimeter-widget-preview]');
    // mount() attaches a shadow root and appends a react root element to it; a
    // plain `:scope > div` locator can't see across the shadow boundary, so wait
    // on the shadow root's childElementCount instead.
    await page.waitForFunction(
      () =>
        (document.querySelector('[data-perimeter-widget-preview]') as HTMLElement | null)
          ?.shadowRoot?.childElementCount,
      undefined,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(3000); // data/images settle — crude but this is a one-shot audit
    const studioShot = PNG.sync.read(await studioHost.screenshot());

    // Fixture side: the real loader flow against the freshly built bundle.
    await page.goto(`http://localhost:4173/${name}.html`);
    const fixtureHost = page.locator(`[data-perimeter-widget="${name}"]`);
    await page.waitForFunction(
      (widget) =>
        (document.querySelector(`[data-perimeter-widget="${widget}"]`) as HTMLElement | null)
          ?.shadowRoot?.childElementCount,
      name,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(3000);
    const fixtureShot = PNG.sync.read(await fixtureHost.screenshot());

    const width = Math.min(studioShot.width, fixtureShot.width);
    const height = Math.min(studioShot.height, fixtureShot.height);
    const studioCrop = crop(studioShot, width, height);
    const fixtureCrop = crop(fixtureShot, width, height);
    const diff = new PNG({ width, height });
    const mismatched = pixelmatch(studioCrop.data, fixtureCrop.data, diff.data, width, height, {
      threshold: 0.1,
    });
    const ratio = mismatched / (width * height);

    // Write the cropped images so studio/fixture/diff share the compared box;
    // the .md records the full original sizes (the width gap is a finding).
    writeFileSync(`reports/visual-${name}-studio.png`, PNG.sync.write(studioCrop));
    writeFileSync(`reports/visual-${name}-fixture.png`, PNG.sync.write(fixtureCrop));
    writeFileSync(`reports/visual-${name}-diff.png`, PNG.sync.write(diff));
    writeFileSync(
      `reports/visual-${name}.md`,
      [
        `# Visual parity — ${name}`,
        `- studio: ${studioShot.width}x${studioShot.height}`,
        `- fixture: ${fixtureShot.width}x${fixtureShot.height}`,
        `- mismatched pixels: ${mismatched} (${(ratio * 100).toFixed(2)}%)`,
        `- note: sermons hits the live API — data/image variance inflates the number; read the diff image, not just the ratio.`,
      ].join('\n'),
    );
    // No hard assertion on ratio — this is measurement, not a gate. Phase 2 may add one.
    expect(mismatched).toBeGreaterThanOrEqual(0);
  });
}
