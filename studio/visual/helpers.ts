import { mkdirSync } from 'node:fs';
import type { Page, Route } from '@playwright/test';
import { sermonsResponse, seriesResponse, facetResponse } from './fixtures/sermons';

export const STUDIO_URL = 'http://localhost:5173';
export const PREVIEW_HOST = '[data-perimeter-widget-preview]';

/** A 1×1 transparent PNG so mocked sermon images resolve (no real perimeter-api). */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Route-mock the sermons API so the widget renders WITHOUT a running
 * perimeter-api. The studio dev base is `localhost:5500`; this intercepts every
 * `**​/api/sermons**` request before that (nonexistent) origin fails. Dispatch by
 * path so list/series/facet/image endpoints each get a valid shape.
 *
 * MUST be registered before `page.goto` so the React Query mount sees the mock.
 */
export async function mockSermonsApi(
  page: Page,
  opts: { listDelayMs?: number; imageDelayMs?: number } = {},
): Promise<void> {
  const { listDelayMs = 0, imageDelayMs = 0 } = opts;
  const wait = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

  // Image endpoint first (more specific) — `/api/sermons/<id>/image` → tiny PNG.
  // An optional delay keeps the image in its per-image Skeleton/blur-up state
  // long enough for the harness to observe it before the real <img> loads.
  await page.route('**/api/sermons/**/image', async (route: Route) => {
    await wait(imageDelayMs);
    await route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG });
  });

  await page.route('**/api/sermons**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    // Image requests also match `**/api/sermons**`. Playwright runs the
    // most-recently-registered route first, so this list handler sees image URLs
    // too — hand them back to the dedicated `/image` route (which applies the
    // image delay + PNG body) instead of serving JSON (which would error the
    // <img> into the ImagePlaceholder and skip the blur-up Skeleton).
    if (/\/image\/?$/.test(path)) return route.fallback();

    // An optional list delay holds the query in its loading state so the
    // viewMode-aware results skeleton is observable before the data resolves.
    await wait(listDelayMs);
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    // `/api/sermons/series` and `/api/sermons/series-types` both start with series;
    // series-types is a facet (bare array), series is the list endpoint.
    if (/\/api\/sermons\/series-types\/?$/.test(path)) return json(facetResponse);
    if (/\/api\/sermons\/series\/?$/.test(path)) return json(seriesResponse);
    if (/\/api\/sermons\/(speakers|books|service-types)\/?$/.test(path)) return json(facetResponse);
    // Anything else under /api/sermons (the list endpoint, with or without query).
    if (/\/api\/sermons\/?$/.test(path)) return json(sermonsResponse);
    // Detail endpoints aren't exercised by the smoke spec; fall back to the list.
    return json(sermonsResponse);
  });
}

/**
 * Wait for the widget shadow root to actually mount React content. `mount()`
 * attaches a shadow root and appends a react root element to it; a light-DOM
 * locator can't cross the shadow boundary, so poll `shadowRoot.childElementCount`
 * (the proven pattern from packages/parity).
 */
export async function waitForShadowMount(page: Page): Promise<void> {
  await page.waitForFunction(
    (sel) =>
      (document.querySelector(sel) as HTMLElement | null)?.shadowRoot?.childElementCount ?? 0,
    PREVIEW_HOST,
    { timeout: 30_000 },
  );
}

/**
 * Wait for the sermon grid cards to actually render — `waitForShadowMount` only
 * proves the React root mounted; the cards arrive a tick later when the mocked
 * `useSermons` query resolves. Poll until at least `min` grid buttons exist so
 * reads don't race the React Query mount.
 */
export async function waitForSermonCards(page: Page, min = 1): Promise<void> {
  await page.waitForFunction(
    ({ sel, want }) => {
      const host = document.querySelector(sel) as HTMLElement | null;
      return (host?.shadowRoot?.querySelectorAll('.grid button').length ?? 0) >= want;
    },
    { sel: PREVIEW_HOST, want: min },
    { timeout: 30_000 },
  );
}

/**
 * Wait until the loading skeleton has been replaced by loaded content — i.e. the
 * `[data-slot="sermon-skeleton"]` wrapper is gone and at least one MediaCard
 * thumbnail `<img>` is present. viewMode-agnostic (list/large don't use `.grid`).
 */
export async function waitForResultsLoaded(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const host = document.querySelector('[data-perimeter-widget-preview]') as HTMLElement | null;
      const root = host?.shadowRoot;
      if (!root) return false;
      const stillLoading = !!root.querySelector('[data-slot="sermon-skeleton"]');
      const hasCards = (root.querySelectorAll('img').length ?? 0) >= 1;
      return !stillLoading && hasCards;
    },
    undefined,
    { timeout: 30_000 },
  );
}

/**
 * Toggle the WIDGET theme via the Canvas "Preview theme" segmented group
 * (`role="group" aria-label="Preview theme"`). This sets `data-theme` on the
 * shadow HOST (the `[data-perimeter-widget-preview]` div) — exactly what
 * `:host([data-theme="dark"])` matches, which is what the dropdown/text-color
 * assertions need. This is NOT the Sidebar chrome toggle (`setStudioTheme`).
 */
export async function setWidgetTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const group = page.getByRole('group', { name: 'Preview theme' });
  await group
    .getByRole('button', { name: theme === 'dark' ? 'Dark' : 'Light', exact: true })
    .click();
  // The toggle drives `data-theme` on the host via lifted React state; wait for
  // the attribute to actually land before reading computed colors.
  await page.waitForFunction(
    ({ sel, want }) => {
      const host = document.querySelector(sel) as HTMLElement | null;
      const has = host?.getAttribute('data-theme') === 'dark';
      return want === 'dark' ? has : !has;
    },
    { sel: PREVIEW_HOST, want: theme },
    { timeout: 10_000 },
  );
}

/**
 * Toggle the STUDIO chrome theme (the Sidebar toggle, sets `data-theme` on
 * `document.documentElement`). Separate control from the widget theme.
 */
export async function setStudioTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const current = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  );
  if (current === theme) return;
  await page.getByRole('button', { name: /theme/i }).first().click();
}

/**
 * Read the computed `color` (or another property) of the first element matching
 * `shadowSelector` INSIDE the widget shadow root. Returns the browser's
 * serialized `rgb(...)` string.
 */
export async function readComputedColor(
  page: Page,
  shadowSelector: string,
  property = 'color',
): Promise<string> {
  return page.evaluate(
    ({ hostSel, sel, prop }) => {
      const host = document.querySelector(hostSel) as HTMLElement | null;
      const root = host?.shadowRoot;
      const el = root?.querySelector(sel) as HTMLElement | null;
      if (!el) throw new Error(`shadow selector not found: ${sel}`);
      return getComputedStyle(el).getPropertyValue(prop).trim();
    },
    { hostSel: PREVIEW_HOST, sel: shadowSelector, prop: property },
  );
}

/** Count elements matching a selector inside the widget shadow root. */
export async function shadowCount(page: Page, shadowSelector: string): Promise<number> {
  return page.evaluate(
    ({ hostSel, sel }) => {
      const host = document.querySelector(hostSel) as HTMLElement | null;
      return host?.shadowRoot?.querySelectorAll(sel).length ?? 0;
    },
    { hostSel: PREVIEW_HOST, sel: shadowSelector },
  );
}

/** Read an attribute (default `class`) of the first element matching the selector in the shadow root, or null if absent. */
export async function shadowAttr(
  page: Page,
  shadowSelector: string,
  attr = 'class',
): Promise<string | null> {
  return page.evaluate(
    ({ hostSel, sel, a }) => {
      const host = document.querySelector(hostSel) as HTMLElement | null;
      const el = host?.shadowRoot?.querySelector(sel) as HTMLElement | null;
      return el?.getAttribute(a) ?? null;
    },
    { hostSel: PREVIEW_HOST, sel: shadowSelector, a: attr },
  );
}

/** Click an element inside the widget shadow root (light-DOM locators can't reach it). */
export async function clickInShadow(page: Page, shadowSelector: string): Promise<void> {
  await page.evaluate(
    ({ hostSel, sel }) => {
      const host = document.querySelector(hostSel) as HTMLElement | null;
      const el = host?.shadowRoot?.querySelector(sel) as HTMLElement | null;
      if (!el) throw new Error(`shadow selector not found for click: ${sel}`);
      el.click();
    },
    { hostSel: PREVIEW_HOST, sel: shadowSelector },
  );
}

/** True when an element matching `shadowSelector` exists inside the widget shadow root. */
async function existsInShadow(page: Page, shadowSelector: string): Promise<boolean> {
  return page.evaluate(
    ({ hostSel, sel }) =>
      !!(document.querySelector(hostSel) as HTMLElement | null)?.shadowRoot?.querySelector(sel),
    { hostSel: PREVIEW_HOST, sel: shadowSelector },
  );
}

/**
 * Robustly open a dropdown rendered inside the widget shadow root, then leave it
 * open. Waits for the trigger to exist first (the toolbar can be transiently
 * absent right after a theme toggle / data settle — observed in diagnostics),
 * then clicks it and waits for `popupSelector`. If the click is dropped under
 * suite contention it retries — but it only clicks while the menu is CLOSED, so
 * a retry never toggles an already-open menu shut. Replaces a one-shot
 * `clickInShadow` + single `waitForFunction(5s)`, which flaked under load.
 *
 * `popupSelector` MUST uniquely identify THIS dropdown's popup (e.g. the sort
 * popup is `.w-48`, the view/icon-select popup `.w-44`) — a generic
 * `.absolute.z-50` also matches always-present @perimeter/ui popups and would
 * read as "already open".
 */
export async function openShadowMenu(
  page: Page,
  triggerSelector: string,
  popupSelector: string,
): Promise<void> {
  await page.waitForFunction(
    ({ hostSel, sel }) =>
      !!(document.querySelector(hostSel) as HTMLElement | null)?.shadowRoot?.querySelector(sel),
    { hostSel: PREVIEW_HOST, sel: triggerSelector },
    { timeout: 10_000 },
  );
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await existsInShadow(page, popupSelector)) return;
    await clickInShadow(page, triggerSelector);
    try {
      await page.waitForFunction(
        ({ hostSel, sel }) =>
          !!(document.querySelector(hostSel) as HTMLElement | null)?.shadowRoot?.querySelector(sel),
        { hostSel: PREVIEW_HOST, sel: popupSelector },
        { timeout: 3000 },
      );
      return;
    } catch {
      // Click likely dropped under load — loop and retry. The top-of-loop guard
      // skips re-clicking if a delayed render has since opened the menu.
    }
  }
  throw new Error(`shadow menu did not open: ${popupSelector}`);
}

/**
 * Parse an `rgb(r, g, b)` / `rgba(...)` string and return relative luminance
 * (0 = black, 1 = white) so assertions can say "this text is LIGHT" without
 * pinning an exact token value (tokens may shift).
 */
export function luminance(rgb: string): number {
  const m = rgb.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) throw new Error(`not an rgb color: ${rgb}`);
  const [r, g, b] = m.slice(0, 3).map((n) => Number(n) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export const SCREENSHOT_DIR = 'visual/__screenshots__';

/** Screenshot the preview host into the gitignored screenshots dir for eyeballing. */
export async function snapshotPreview(page: Page, name: string): Promise<void> {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.locator(PREVIEW_HOST).screenshot({ path: `${SCREENSHOT_DIR}/${name}.png` });
}
