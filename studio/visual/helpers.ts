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
export async function mockSermonsApi(page: Page): Promise<void> {
  // Image endpoint first (more specific) — `/api/sermons/<id>/image` → tiny PNG.
  await page.route('**/api/sermons/**/image', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG }),
  );

  await page.route('**/api/sermons**', (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
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
