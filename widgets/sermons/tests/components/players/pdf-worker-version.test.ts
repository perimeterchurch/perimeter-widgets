import { describe, it, expect } from 'vitest';
import workerPkg from 'pdfjs-dist/package.json';
import reactPdfPkg from 'react-pdf/package.json';

/**
 * Regression guard for the pdf.js "API version does not match the Worker version"
 * runtime error. The API comes from react-pdf's hard-pinned `pdfjs-dist`
 * (re-exported as `pdfjs`); PdfViewer loads the worker from the sermons package's
 * OWN `pdfjs-dist` (`build/pdf.worker.min.mjs`). If sermons' `pdfjs-dist` floats to
 * a different version than the one react-pdf pins, the two resolve to separate
 * copies and pdf.js throws at runtime.
 *
 * We compare package.json versions (not the runtime modules — importing pdfjs-dist
 * needs DOMMatrix, absent in jsdom). `pdfjs-dist/package.json` is the copy the
 * worker import resolves to; react-pdf pins its `pdfjs-dist` exactly. Keep sermons'
 * `pdfjs-dist` pinned to that same exact version so both resolve to one copy.
 */
describe('pdf.js worker/API version alignment', () => {
  it("sermons' bundled pdfjs-dist (worker source) matches react-pdf's pinned pdfjs-dist", () => {
    const reactPdfPinned = (reactPdfPkg.dependencies as Record<string, string>)['pdfjs-dist'];
    expect(workerPkg.version).toBe(reactPdfPinned);
  });
});
