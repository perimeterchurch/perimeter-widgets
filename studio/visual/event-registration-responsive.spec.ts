import { test, expect, type Page, type Route } from '@playwright/test';
import { STUDIO_URL, waitForShadowMount } from './helpers';
import { familyNightEvent, parentGatheringQuote } from './fixtures/event-registration';

/**
 * Mobile-first layout verification for the event-registration widget. Drives
 * the studio viewport presets (Mobile ≈ 343px, Tablet ≈ 702px, Desktop ≈ 1100px
 * after the HostFrame gutter ramp) and asserts the breakpoint branches:
 *   - phone/tablet: sticky summary bar + sticky CTA, no review column, one card
 *     per section in one column (tablet: still one column, picture beside copy)
 *   - desktop: review `<aside>` in a sticky right column, two cards per row
 *     from 1024px, no sticky bars
 * The bottom-sheet editor is a top-layer `<dialog>`, so only its presence is
 * asserted here: its geometry escapes the studio frame to the test viewport,
 * exactly like the sermons date-range overlay. Verify the sheet on embed-lab.
 */

const PREVIEW = '[data-perimeter-widget-preview]';
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function mockRegistrationApi(page: Page): Promise<void> {
  await page.route('**/api/event-image/**', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG }),
  );
  await page.route('**/api/registration/**', (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    if (/\/quote\/?$/.test(path)) return json(parentGatheringQuote);
    if (/\/roster\/?$/.test(path)) return route.fulfill({ status: 401, body: '{}' });
    return json(familyNightEvent);
  });
}

async function selectPreset(page: Page, name: 'Mobile' | 'Tablet' | 'Desktop') {
  await page
    .getByRole('group', { name: 'Viewport width presets' })
    .getByRole('button', { name, exact: true })
    .click();
}

async function widgetState(page: Page) {
  return page.evaluate((host) => {
    const sr = (document.querySelector(host) as HTMLElement | null)?.shadowRoot;
    const container = sr?.querySelector('[class~="@container"]') as HTMLElement | null;
    const cards = [...(sr?.querySelectorAll('section[aria-labelledby]') ?? [])] as HTMLElement[];
    const cardGrid = cards[0]?.parentElement ?? null;
    const bar = sr?.querySelector('[data-slot="summary-bar"]') as HTMLElement | null;
    const cta = sr?.querySelector('[data-slot="sticky-cta"]') as HTMLElement | null;
    const aside = sr?.querySelector('aside[aria-labelledby="registration-review-title"]');
    const cols = (el: Element | null) =>
      el ? getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length : 0;
    return {
      containerWidth: container?.clientWidth ?? 0,
      overflow: container ? container.scrollWidth > container.clientWidth + 1 : false,
      cardCount: cards.length,
      cardTitles: cards.map((c) => c.querySelector('h3')?.textContent ?? ''),
      cardGridCols: cols(cardGrid),
      // Phone/tablet stack the picture on top or beside the copy; either way one card per row.
      hasBar: !!bar,
      barPosition: bar ? getComputedStyle(bar).position : null,
      hasCta: !!cta,
      ctaPosition: cta ? getComputedStyle(cta).position : null,
      ctaText: cta?.textContent ?? '',
      hasAside: !!aside,
      asidePosition: aside ? getComputedStyle(aside.parentElement as Element).position : null,
      hasDialog: !!sr?.querySelector('dialog[open]'),
      addButtons: [...(sr?.querySelectorAll('button') ?? [])]
        .filter((b) => /^Add/.test(b.textContent?.trim() ?? ''))
        .map((b) => Math.round(b.getBoundingClientRect().height)),
    };
  }, PREVIEW);
}

const CONFIG = encodeURIComponent(JSON.stringify({ eventId: 900001 }));

test.describe('event-registration mobile-first layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockRegistrationApi(page);
    await page.goto(`${STUDIO_URL}/widgets/event-registration?tab=dev&config=${CONFIG}`);
    await waitForShadowMount(page);
    await expect.poll(async () => (await widgetState(page)).cardCount, { timeout: 15_000 }).toBe(3);
  });

  test('phone: sticky summary bar and CTA, one column, every section, no overflow', async ({
    page,
  }) => {
    await selectPreset(page, 'Mobile');
    // Poll the settled phone state as one predicate: the bar appears as soon as
    // the frame drops under 768px, before the preset's width has settled.
    await expect
      .poll(
        async () => {
          const s = await widgetState(page);
          return s.containerWidth < 480 && s.hasBar;
        },
        { message: 'phone container settled with the summary bar', timeout: 10_000 },
      )
      .toBe(true);
    const s = await widgetState(page);
    expect(s.overflow, 'no horizontal overflow').toBe(false);
    expect(s.barPosition, 'summary bar sticks').toBe('sticky');
    expect(s.hasCta, 'sticky CTA present').toBe(true);
    expect(s.ctaPosition).toBe('sticky');
    expect(s.ctaText).toContain('Add someone to continue');
    expect(s.hasAside, 'no review column on phone').toBe(false);
    expect(s.cardGridCols, 'one card per row').toBe(1);
    expect(s.cardTitles).toEqual([
      'Parent Gathering',
      'Student Night of Worship (Grades 6-12)',
      'Elementary Active (Grades K-5)',
    ]);
    for (const h of s.addButtons)
      expect(h, 'add buttons are at least 44px tall').toBeGreaterThanOrEqual(44);
  });

  test('phone: Add opens the bottom-sheet dialog', async ({ page }) => {
    await selectPreset(page, 'Mobile');
    await expect
      .poll(
        async () => {
          const s = await widgetState(page);
          return s.containerWidth < 480 && s.hasBar;
        },
        { timeout: 10_000 },
      )
      .toBe(true);
    await page.evaluate((host) => {
      const sr = (document.querySelector(host) as HTMLElement).shadowRoot!;
      const btn = [...sr.querySelectorAll('section[aria-labelledby] button')].find(
        (b) => b.textContent?.trim() === 'Add registrant',
      ) as HTMLButtonElement;
      btn.click();
    }, PREVIEW);
    await expect
      .poll(async () => (await widgetState(page)).hasDialog, { timeout: 10_000 })
      .toBe(true);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect
      .poll(async () => (await widgetState(page)).hasDialog, { timeout: 10_000 })
      .toBe(false);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
  });

  test('tablet: still the phone chrome, one card per row, no overflow', async ({ page }) => {
    await selectPreset(page, 'Tablet');
    await expect
      .poll(
        async () => {
          const s = await widgetState(page);
          return s.containerWidth >= 480 && s.containerWidth < 768 && s.hasBar;
        },
        { timeout: 10_000 },
      )
      .toBe(true);
    const s = await widgetState(page);
    expect(s.overflow).toBe(false);
    expect(s.hasCta).toBe(true);
    expect(s.hasAside).toBe(false);
    expect(s.cardGridCols).toBe(1);
  });

  test('desktop: sticky review column, two cards per row, no sticky bars', async ({ page }) => {
    await selectPreset(page, 'Desktop');
    await expect
      .poll(async () => (await widgetState(page)).hasAside, { timeout: 10_000 })
      .toBe(true);
    const s = await widgetState(page);
    expect(s.containerWidth).toBeGreaterThanOrEqual(1024);
    expect(s.overflow).toBe(false);
    expect(s.hasBar, 'no summary bar on desktop').toBe(false);
    expect(s.hasCta, 'no sticky CTA on desktop').toBe(false);
    expect(s.asidePosition, 'review column sticks').toBe('sticky');
    expect(s.cardGridCols, 'two cards per row from 1024px').toBe(2);
  });
});
