import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end guard for the pdf.js worker split (PR #127): the BUILT sermons
 * bundle, loaded through the REAL production path (fixture page → loader.js →
 * manifest → /sermons/dev/index.js), must fetch its sibling
 * pdf.worker.min.mjs artifact, blob-install it, and render a real PDF page to
 * canvas. This is the one flow no unit or studio spec covers: script-base
 * capture from the injecting <script> tag, the sibling-URL fetch, the
 * cross-origin blob worker, and pdf.js actually executing the split worker.
 *
 * The API is route-mocked (the built bundle targets the production API base),
 * with CORS headers because the fixture page is a different origin. The PDF
 * itself is a real minimal document generated below — if the worker fails to
 * install or execute, react-pdf renders the error state instead of a canvas.
 */

/** Build a minimal but structurally valid one-page PDF (correct xref offsets). */
function minimalPdf(): Buffer {
  const head = '%PDF-1.4\n';
  const objects = [
    '1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n',
    '2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n',
    '3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<<>>>>\nendobj\n',
  ];
  let body = head;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body);
  const xref =
    `xref\n0 ${objects.length + 1}\n` +
    `0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  const trailer = `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer);
}

const PDF_URL = 'https://pdf-fixture.invalid/sermon.pdf';
const CORS = { 'access-control-allow-origin': '*' };
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const sermon = {
  id: 101,
  title: 'The Weight of Glory',
  subtitle: null,
  shortDescription: 'A meditation on eternal things.',
  date: '2026-05-31',
  bannerUrl: null,
  speaker: { id: 1, name: 'Randy Pope', bio: null },
  series: { id: 10, title: 'Foundations' },
  congregation: { id: 1 },
  book: { id: 49, name: 'Ephesians' },
};

const detailResponse = {
  success: true,
  data: {
    ...sermon,
    description: null,
    transcript: null,
    scriptureLinks: null,
    links: [
      { id: 1, url: PDF_URL, type: 'PDF', mediaType: 'document', duration: null, position: 1 },
    ],
  },
};

const listResponse = {
  success: true,
  data: {
    sermons: [sermon],
    pagination: { page: 1, perPage: 12, total: 1, totalPages: 1 },
  },
};

/**
 * Route-mock every origin the BUILT bundle touches. It runs with the
 * production API base, so the fixture page's fetches are cross-origin —
 * every fulfillment needs CORS headers.
 */
async function mockApis(page: Page): Promise<void> {
  await page.route(`${PDF_URL}*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: CORS,
      body: minimalPdf(),
    }),
  );
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
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: CORS,
        body: TINY_PNG,
      });
    }
    if (/\/api\/sermons\/sermon\/\d+\/?$/.test(path)) return json(detailResponse);
    if (/\/(series-types|speakers|books|service-types)\/?$/.test(path)) {
      return json({ success: true, data: [] });
    }
    if (/\/api\/sermons\/series\/?$/.test(path)) {
      return json({
        success: true,
        data: { series: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
      });
    }
    return json(listResponse);
  });
}

test('built bundle fetches its sibling pdf worker and renders a PDF page', async ({ page }) => {
  await mockApis(page);

  const workerRequest = page.waitForRequest((req) => req.url().endsWith('/pdf.worker.min.mjs'), {
    timeout: 60_000,
  });

  // Real production path: loader.js → manifest → built IIFE.
  await page.goto('http://localhost:4173/sermons.html');
  const host = page.locator('[data-perimeter-widget="sermons"]');

  // Playwright locators pierce open shadow roots: click into the detail view.
  await host
    .getByRole('button', { name: /The Weight of Glory/ })
    .first()
    .click();

  // The worker must be fetched from the bundle's own immutable directory —
  // proof the document.currentScript base capture survived the IIFE build.
  const req = await workerRequest;
  expect(req.url()).toBe('http://localhost:4173/sermons/dev/pdf.worker.min.mjs');

  // pdf.js executed the split worker end-to-end: a real page canvas renders
  // (react-pdf only paints canvas after the worker parses the document).
  await expect(host.locator('.react-pdf__Page canvas').first()).toBeVisible({ timeout: 30_000 });
  await expect(host.getByText('Failed to load PDF')).toHaveCount(0);
});
