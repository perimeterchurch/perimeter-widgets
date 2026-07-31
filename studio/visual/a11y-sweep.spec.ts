import { test, expect, type Page, type Route } from '@playwright/test';
import {
  STUDIO_URL,
  PREVIEW_HOST,
  mockSermonsApi,
  waitForShadowMount,
  waitForSermonCards,
  setWidgetTheme,
  snapshotPreview,
} from './helpers';
import { facetResponse } from './fixtures/sermons';

/**
 * Visual + a11y proof for the Task 6 correctness sweep. jsdom renders no real
 * layout/color and can't run native button keyboard activation, which is why
 * these checks run in a real browser against the widget shadow root:
 *
 *  - Pagination is keyboard-reachable: every page control is a real <button>
 *    (focusable + Enter-activatable) rather than an hrefless <a>.
 *  - The empty-results card draws its dashed border in both themes (a
 *    `border-dashed`-only class renders nothing without width+color).
 *
 * (The error-boundary token/Reload fix is exercised by the widget-runtime unit
 * test — the studio has no hook to crash a mounted widget on demand.)
 */

/** A sermons list response with N total pages (page 1 of `totalPages`). */
function multiPageSermons(totalPages: number) {
  return {
    success: true as const,
    data: {
      sermons: [
        {
          id: 201,
          title: 'Page One Sermon',
          subtitle: null,
          shortDescription: 'First page.',
          date: '2026-05-31',
          bannerUrl: null,
          speaker: { id: 1, name: 'Randy Pope' },
          series: { id: 10, title: 'Foundations' },
          congregation: { id: 1 },
          book: { id: 49, name: 'Ephesians' },
        },
      ],
      pagination: { page: 1, perPage: 1, total: totalPages, totalPages },
    },
  };
}

const emptySermons = {
  success: true as const,
  data: { sermons: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
};

/** Override the sermons LIST endpoint with a custom body (facets stay mocked). */
async function routeSermonsList(page: Page, body: unknown): Promise<void> {
  await page.route('**/api/sermons**', (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (b: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
    if (/\/api\/sermons\/series-types\/?$/.test(path)) return json(facetResponse);
    if (/\/api\/sermons\/series\/?$/.test(path))
      return json({
        success: true,
        data: { series: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
      });
    if (/\/api\/sermons\/(speakers|books|service-types)\/?$/.test(path)) return json(facetResponse);
    if (/\/api\/sermons\/?$/.test(path)) return json(body);
    return json(body);
  });
}

test.describe('Pagination — keyboard reachable (shadow DOM)', () => {
  test('page control is a focusable <button> that activates on Enter', async ({ page }) => {
    await mockSermonsApi(page); // image route + defaults
    await routeSermonsList(page, multiPageSermons(3));
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev`);
    await waitForShadowMount(page);
    await waitForSermonCards(page, 1);

    // The pager renders inside the shadow root once totalPages > 1.
    await page.waitForFunction(
      (sel) =>
        (document.querySelector(sel) as HTMLElement | null)?.shadowRoot?.querySelector(
          'nav[aria-label] [data-slot="pagination-link"]',
        ) != null,
      PREVIEW_HOST,
      { timeout: 30_000 },
    );

    // Every pagination control must be a real <button> (the a11y fix) — never an
    // hrefless <a>.
    const tagNames = await page.evaluate((sel) => {
      const host = document.querySelector(sel) as HTMLElement | null;
      const links = host?.shadowRoot?.querySelectorAll('[data-slot="pagination-link"]') ?? [];
      return Array.from(links).map((el) => el.tagName);
    }, PREVIEW_HOST);
    expect(tagNames.length).toBeGreaterThan(0);
    expect(tagNames.every((t) => t === 'BUTTON')).toBe(true);

    // Focus page-2's button inside the shadow root and arm a one-shot click
    // listener. Then press Enter via the real keyboard: a native <button> fires
    // a click on Enter (the a11y win over the old hrefless <a>, which did not).
    const focused = await page.evaluate((sel) => {
      const root = (document.querySelector(sel) as HTMLElement | null)?.shadowRoot;
      const buttons = Array.from(
        root?.querySelectorAll<HTMLButtonElement>('[data-slot="pagination-link"]') ?? [],
      );
      const page2 = buttons.find((b) => (b.textContent ?? '').trim() === '2');
      if (!page2) throw new Error('page 2 button not found');
      page2.focus();
      (window as unknown as { __pageBtnClicked?: boolean }).__pageBtnClicked = false;
      page2.addEventListener(
        'click',
        () => {
          (window as unknown as { __pageBtnClicked?: boolean }).__pageBtnClicked = true;
        },
        { once: true },
      );
      return root?.activeElement === page2;
    }, PREVIEW_HOST);
    expect(focused, 'page button must be keyboard-focusable').toBe(true);

    await page.keyboard.press('Enter');
    const enterClicked = await page.evaluate(
      () => (window as unknown as { __pageBtnClicked?: boolean }).__pageBtnClicked === true,
    );
    expect(enterClicked, 'pressing Enter on the focused page button must activate it').toBe(true);

    await snapshotPreview(page, 'pagination-keyboard');
  });
});

test.describe('MultiCombobox — shadow-DOM mount does not loop (regression)', () => {
  // The shadow-DOM `Environment` derivation must run exactly once. A prior
  // version recomputed a fresh object literal each render and fed the stored
  // value back into the effect deps, so inside a real ShadowRoot it never
  // converged → React "Maximum update depth exceeded". jsdom has no ShadowRoot,
  // so that bug was invisible to unit tests; this loads the real sermons widget
  // (whose SermonFilters render several MultiComboboxes in the shadow root) and
  // asserts they mount without crashing.
  test('SermonFilters comboboxes mount in the shadow root without a render loop', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await mockSermonsApi(page);
    await routeSermonsList(page, multiPageSermons(2));
    await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev`);
    await waitForShadowMount(page);
    // If the comboboxes looped, render would throw before cards ever appear.
    await waitForSermonCards(page, 1);

    // The filter comboboxes actually rendered (each MultiCombobox emits a
    // data-slot="multi-combobox" root + a "toggle menu" button).
    const comboboxCount = await page.evaluate((sel) => {
      const root = (document.querySelector(sel) as HTMLElement | null)?.shadowRoot;
      return root?.querySelectorAll('[data-slot="multi-combobox"]').length ?? 0;
    }, PREVIEW_HOST);
    expect(comboboxCount, 'SermonFilters renders multiple filter comboboxes').toBeGreaterThan(0);

    // The smoking-gun symptom of the loop is this exact React invariant.
    const loopErrors = errors.filter((e) => /Maximum update depth exceeded/i.test(e));
    expect(loopErrors, `unexpected render-loop errors:\n${loopErrors.join('\n')}`).toHaveLength(0);
  });
});

test.describe('Empty results — dashed border renders', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`empty card shows a real dashed border (${theme})`, async ({ page }) => {
      await mockSermonsApi(page);
      await routeSermonsList(page, emptySermons);
      await page.goto(`${STUDIO_URL}/widgets/sermons?tab=dev`);
      await waitForShadowMount(page);
      await setWidgetTheme(page, theme);

      // The empty card arrives a tick after mount, once the (mocked) zero-result
      // query resolves and the skeleton→empty transition settles.
      await page.waitForFunction(
        (sel) =>
          (document.querySelector(sel) as HTMLElement | null)?.shadowRoot?.querySelector(
            '[data-slot="results-empty"]',
          ) != null,
        PREVIEW_HOST,
        { timeout: 30_000 },
      );

      const border = await page.evaluate((sel) => {
        const host = document.querySelector(sel) as HTMLElement | null;
        const el = host?.shadowRoot?.querySelector(
          '[data-slot="results-empty"]',
        ) as HTMLElement | null;
        if (!el) throw new Error('empty card not found');
        const cs = getComputedStyle(el);
        return { style: cs.borderTopStyle, width: parseFloat(cs.borderTopWidth) };
      }, PREVIEW_HOST);

      // `border-dashed` alone draws nothing; the fix adds `border` width + color.
      expect(border.style).toBe('dashed');
      expect(border.width, `border width in ${theme}`).toBeGreaterThan(0);

      await snapshotPreview(page, `empty-border-${theme}`);
    });
  }
});
