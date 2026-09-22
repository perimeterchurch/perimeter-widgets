import { test, expect, type Page, type Route } from '@playwright/test';
import { STUDIO_URL, waitForShadowMount } from './helpers';
import {
  familyNightEvent,
  parentGatheringQuote,
  parentGatheringSubmit,
} from './fixtures/event-registration';

/**
 * Mobile-first layout verification for the event-registration widget. Drives
 * the studio viewport presets (Mobile ≈ 343px, Tablet ≈ 702px, Desktop ≈ 1100px
 * after the HostFrame gutter ramp) and asserts the breakpoint branches:
 *   - phone/tablet: sticky summary bar + sticky CTA, no review column, one card
 *     per section in one column, picture on top of the copy
 *   - desktop: one horizontal card per row (picture beside the copy), the
 *     review `<aside>` below every section, no sticky bars
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
    if (/\/submit\/?$/.test(path)) return json(parentGatheringSubmit);
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
      groupHeadings: [...(sr?.querySelectorAll('[data-slot="section-group"] h1') ?? [])].map(
        (h) => h.textContent ?? '',
      ),
      cardGridCols: cols(cardGrid),
      // 1 = picture on top of the copy (phone/tablet), 2 = beside it (desktop).
      cardCols: cols(cards[0] ?? null),
      hasBar: !!bar,
      barPosition: bar ? getComputedStyle(bar).position : null,
      hasCta: !!cta,
      ctaPosition: cta ? getComputedStyle(cta).position : null,
      ctaText: cta?.textContent ?? '',
      hasAside: !!aside,
      asideBelowCards:
        !!aside &&
        cards.every(
          (c) => aside.getBoundingClientRect().top >= c.getBoundingClientRect().bottom - 1,
        ),
      hasDialog: !!sr?.querySelector('dialog[open]'),
      hasConfirmation: !!sr?.querySelector('[data-slot="registration-complete"]'),
      confirmationText: sr?.querySelector('[data-slot="registration-complete"]')?.textContent ?? '',
      addButtons: [
        ...(sr?.querySelectorAll('section[aria-labelledby] button[data-stretched]') ?? []),
      ].map((b) => Math.round(b.getBoundingClientRect().height)),
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
    expect(s.groupHeadings, 'staff-set Section_Group headings').toEqual(['Adults', 'Kids']);
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
    // The card is the control: its footer button is stretched over the card.
    const clickAdd = () =>
      page.evaluate((host) => {
        const sr = (document.querySelector(host) as HTMLElement).shadowRoot!;
        const btn = [...sr.querySelectorAll('section[aria-labelledby] button')].find(
          (b) => b.textContent?.trim() === "I'm Attending",
        ) as HTMLButtonElement | undefined;
        btn?.click();
        return !!btn;
      }, PREVIEW);
    await expect.poll(clickAdd, { message: "I'm Attending present", timeout: 10_000 }).toBe(true);
    await expect
      .poll(async () => (await widgetState(page)).hasDialog, { timeout: 10_000 })
      .toBe(true);
    const bodyOverflow = () => page.evaluate(() => document.body.style.overflow);
    await expect.poll(bodyOverflow, { timeout: 5_000 }).toBe('hidden');
    await page.keyboard.press('Escape');
    await expect
      .poll(async () => (await widgetState(page)).hasDialog, { timeout: 10_000 })
      .toBe(false);
    await expect.poll(bodyOverflow, { timeout: 5_000 }).toBe('');
  });

  test('phone: a free registration confirms in place instead of going to checkout', async ({
    page,
  }) => {
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
    // Guest path: open the Parent Gathering sheet, give details, add, then submit.
    const clickInShadow = (match: (b: HTMLButtonElement) => boolean) =>
      page.evaluate(
        ({ host, src }) => {
          const sr = (document.querySelector(host) as HTMLElement).shadowRoot!;
          const test = new Function('b', `return (${src})(b)`) as (b: HTMLButtonElement) => boolean;
          const btn = [...sr.querySelectorAll('button')].find((b) => test(b as HTMLButtonElement));
          (btn as HTMLButtonElement | undefined)?.click();
          return !!btn;
        },
        { host: PREVIEW, src: match.toString() },
      );
    await expect
      .poll(() => clickInShadow((b) => b.textContent?.trim() === "I'm Attending"), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect
      .poll(async () => (await widgetState(page)).hasDialog, { timeout: 10_000 })
      .toBe(true);
    await page.evaluate((host) => {
      const sr = (document.querySelector(host) as HTMLElement).shadowRoot!;
      const d = sr.querySelector('dialog')!;
      const set = (suffix: string, value: string) => {
        const input = d.querySelector<HTMLInputElement>(`input[id$="${suffix}"]`)!;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set('-guest-first', 'Sam');
      set('-guest-last', 'Guest');
      set('-guest-email', 'sam@example.com');
      set('-guest-phone', '770-555-1234');
    }, PREVIEW);
    await expect
      .poll(() => clickInShadow((b) => b.textContent?.trim() === 'Add to registration'), {
        timeout: 10_000,
      })
      .toBe(true);
    await expect
      .poll(async () => (await widgetState(page)).hasDialog, { timeout: 10_000 })
      .toBe(false);
    // The mocked quote is $0 and submittable, so the CTA becomes "Complete registration".
    await expect
      .poll(
        () =>
          clickInShadow((b) => b.textContent?.trim() === 'Complete registration' && !b.disabled),
        {
          timeout: 10_000,
        },
      )
      .toBe(true);
    await expect
      .poll(async () => (await widgetState(page)).hasConfirmation, { timeout: 10_000 })
      .toBe(true);
    const s = await widgetState(page);
    expect(s.confirmationText).toContain("You're registered");
    expect(s.confirmationText).toContain('Sam Guest');
    expect(s.confirmationText).toContain('sam@example.com');
    expect(s.hasBar, 'summary bar gone once complete').toBe(false);
    expect(page.url()).toContain('localhost:5173');
  });

  test('tablet: still the phone chrome, one card per row, no overflow', async ({ page }) => {
    await selectPreset(page, 'Tablet');
    // The preview can transiently remount after a preset change, so poll the
    // whole settled state as one predicate (see sermons-responsive.spec.ts).
    await expect
      .poll(
        async () => {
          const s = await widgetState(page);
          if (s.containerWidth < 480 || s.containerWidth >= 768) return `width ${s.containerWidth}`;
          if (!s.hasBar) return 'summary bar absent';
          if (!s.hasCta) return 'sticky CTA absent';
          if (s.hasAside) return 'review column present';
          if (s.overflow) return 'horizontal overflow';
          if (s.cardGridCols !== 1) return `${s.cardGridCols} card columns`;
          if (s.cardCols !== 1) return 'picture beside the copy';
          return 'settled';
        },
        { message: 'tablet layout settled', timeout: 10_000 },
      )
      .toBe('settled');
  });

  test('desktop: horizontal cards one per row, review below them, no sticky bars', async ({
    page,
  }) => {
    await selectPreset(page, 'Desktop');
    await expect
      .poll(async () => (await widgetState(page)).hasAside, { timeout: 10_000 })
      .toBe(true);
    const s = await widgetState(page);
    expect(s.containerWidth).toBeGreaterThanOrEqual(1024);
    expect(s.overflow).toBe(false);
    expect(s.hasBar, 'no summary bar on desktop').toBe(false);
    expect(s.hasCta, 'no sticky CTA on desktop').toBe(false);
    expect(s.asideBelowCards, 'review sits below every section').toBe(true);
    expect(s.cardGridCols, 'one card per row').toBe(1);
    expect(s.cardCols, 'picture beside the copy').toBe(2);
  });
});
