import { test, expect } from '@playwright/test';
import { STUDIO_URL, luminance } from './helpers';

/**
 * Regression for the combobox doc Example. The low-level Combobox portals its
 * popup via a `container`; the doc renders inside the studio's ComponentStage
 * shadow root and uses the StageContainer helper to hand the popup that shadow
 * container. Without it the popup would portal to document.body (outside the
 * shadow) and render unstyled, OR — as before — the Example shipped no
 * ComboboxContent at all and showed a dead text field. This asserts the popup
 * actually opens INSIDE the stage shadow root, themed, with the campus options.
 */

/** Focus an element inside the stage shadow root (a plain <div> host, not the widget preview host). */
async function focusInStageShadow(page: import('@playwright/test').Page, sel: string) {
  await page.evaluate((s) => {
    const host = [...document.querySelectorAll<HTMLElement>('div')].find((d) =>
      d.shadowRoot?.querySelector(s),
    );
    const el = host?.shadowRoot?.querySelector(s) as HTMLElement | null;
    if (!el) throw new Error(`no stage shadow host contains: ${s}`);
    el.focus();
  }, sel);
}

test('combobox doc: the popup portals into the stage shadow root, themed, with options', async ({
  page,
}) => {
  await page.goto(`${STUDIO_URL}/components/combobox`);

  // The Example mounts a ComboboxInput inside the stage shadow root.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('div')].some((d) =>
        d.shadowRoot?.querySelector('input[placeholder="Pick a campus"]'),
      ),
    undefined,
    { timeout: 20_000 },
  );

  // Base UI Combobox opens its list on typing (not a bare click); type a prefix.
  await focusInStageShadow(page, 'input[placeholder="Pick a campus"]');
  await page.keyboard.type('Jo');

  // The popup (data-slot="combobox-content") must appear INSIDE the same stage
  // shadow root — proving StageContainer handed it the in-shadow container.
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll<HTMLElement>('div')].some(
        (d) =>
          d.shadowRoot?.querySelector('input[placeholder="Pick a campus"]') &&
          d.shadowRoot?.querySelector('[data-slot="combobox-content"]'),
      ),
    undefined,
    { timeout: 10_000 },
  );

  // Options render, and the popup background is the themed token surface (not a
  // transparent / unstyled portal escaped to document.body).
  const { text, bg } = await page.evaluate(() => {
    const host = [...document.querySelectorAll<HTMLElement>('div')].find((d) =>
      d.shadowRoot?.querySelector('[data-slot="combobox-content"]'),
    );
    const popup = host!.shadowRoot!.querySelector('[data-slot="combobox-content"]') as HTMLElement;
    return { text: popup.textContent ?? '', bg: getComputedStyle(popup).backgroundColor };
  });
  expect(text).toContain('Johns Creek');
  // bg-bg resolves to an opaque token color (not transparent), proving the popup
  // inherited the stage's token CSS rather than escaping the shadow root.
  expect(bg).not.toBe('rgba(0, 0, 0, 0)');
  expect(Number.isFinite(luminance(bg))).toBe(true);
});
