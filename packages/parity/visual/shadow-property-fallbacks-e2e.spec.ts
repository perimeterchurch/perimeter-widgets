import { test, expect, type Page } from '@playwright/test';

/**
 * Regression guard for the shadow-root @property collapse: Tailwind v4
 * registers its `--tw-*` variables with `@property`, which browsers only
 * process in DOCUMENT stylesheets — inside the widget's shadow sheet they
 * are inert, so border/ring/shadow utilities silently collapse on any host
 * page that doesn't itself load Tailwind (the studio does, which masked
 * this for every studio-based check). The runtime now inlines the registered
 * initial values via `inlinePropertyFallbacks` (@perimeter/theme).
 *
 * This spec asserts COMPUTED styles on the BUILT bundle through the real
 * loader→manifest→fixture path — the exact context where the bug lived.
 */

const CORS = { 'access-control-allow-origin': '*' };

const sermon = {
  id: 101,
  title: 'The Weight of Glory',
  subtitle: null,
  shortDescription: 'A meditation on eternal things.',
  date: '2026-05-31',
  bannerUrl: null,
  speaker: { id: 1, name: 'Randy Pope' },
  series: { id: 10, title: 'Foundations' },
  congregation: { id: 1 },
  book: { id: 49, name: 'Ephesians' },
};

async function mockApis(page: Page): Promise<void> {
  await page.route('**/api/sermons**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS,
        body: JSON.stringify(body),
      });
    if (/\/image\/?$/.test(path)) {
      return route.fulfill({ status: 200, headers: CORS, body: '' });
    }
    if (/\/(series-types|speakers|books|service-types)\/?$/.test(path)) {
      return json({ success: true, data: [] });
    }
    if (/\/api\/sermons\/series\/?$/.test(path)) {
      return json({
        success: true,
        data: { series: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
      });
    }
    return json({
      success: true,
      data: { sermons: [sermon], pagination: { page: 1, perPage: 12, total: 1, totalPages: 1 } },
    });
  });
}

test('built bundle renders @property-dependent utilities on a bare host page', async ({ page }) => {
  await mockApis(page);
  await page.goto('http://localhost:4173/sermons.html');

  // Wait for the widget to mount and render the card grid.
  await page.waitForFunction(
    () => {
      const root = (
        document.querySelector('[data-perimeter-widget="sermons"]') as HTMLElement | null
      )?.shadowRoot;
      return (root?.querySelectorAll('button').length ?? 0) > 3;
    },
    null,
    { timeout: 30_000 },
  );

  const probe = await page.evaluate(() => {
    const root = (document.querySelector('[data-perimeter-widget="sermons"]') as HTMLElement)
      .shadowRoot!;
    const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
    const card = all.find((el) => el.className?.includes?.('ring-1'));
    return {
      // The registered initial value must resolve inside the shadow tree.
      twBorderStyle: getComputedStyle(all[0]!).getPropertyValue('--tw-border-style').trim(),
      // ring-1 composes box-shadow from --tw-ring-shadow etc.; without the
      // fallback the whole composite is invalid and computes to 'none'.
      cardBoxShadow: card ? getComputedStyle(card).boxShadow : 'NO-CARD',
      // At least one element must paint a real solid border (search bar,
      // selects, chips all carry border-border).
      solidBorders: all.filter((el) => {
        const cs = getComputedStyle(el);
        return cs.borderTopStyle === 'solid' && parseFloat(cs.borderTopWidth) > 0;
      }).length,
    };
  });

  expect(probe.twBorderStyle, '--tw-border-style initial value must apply').toBe('solid');
  expect(probe.cardBoxShadow, 'card ring must render as box-shadow').not.toBe('none');
  expect(probe.cardBoxShadow).not.toBe('NO-CARD');
  expect(probe.solidBorders, 'bordered controls must paint').toBeGreaterThan(0);
});
