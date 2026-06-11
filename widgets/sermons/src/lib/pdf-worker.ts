import { pdfjs } from 'react-pdf';
import { scriptBase } from './script-base';

/**
 * Lazily install the pdf.js worker, once, on first PDF open.
 *
 * The worker is NOT bundled: it ships as a sibling immutable artifact
 * (`cdn/<name>/<version>/pdf.worker.min.mjs`, emitted by vite.config.ts from
 * the same pdfjs-dist install the bundle compiles against) and is fetched on
 * demand — pages that never open the PDF tab never pay its ~288 KB gz.
 *
 * Fetch + blob rather than a direct worker URL: browsers refuse cross-origin
 * Workers, and embeds run on the host page's origin while the artifact lives
 * on widgets.perimeter.org. The CDN serves `Access-Control-Allow-Origin: *`,
 * so the source is fetched and wrapped in a same-origin blob URL — the exact
 * CSP posture (`worker-src blob:`) of the previous inlined-source approach.
 */
let workerInit: Promise<void> | null = null;

function resolveWorkerHref(): string {
  // Built bundle: the worker sits next to index.js in the immutable version dir.
  if (scriptBase) return scriptBase + 'pdf.worker.min.mjs';
  if (import.meta.env.DEV) {
    // Studio/dev: Vite serves the widget's own pdfjs-dist install through this
    // module's URL (two hops up = the sermons package root). The path is built
    // from a NON-literal so the build pipeline cannot statically register it:
    // a `?url` dynamic import here — even inside this define-eliminated dead
    // branch — gets eagerly resolved and bundled by Rollup (+166 KB gz,
    // observed), and Vite inlines literal `new URL(..., import.meta.url)`
    // assets in lib mode.
    const rel = '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs';
    return new URL(rel, import.meta.url).href;
  }
  // Built bundle that somehow loaded without a script src (e.g. inlined
  // <script>): resolve relative to the host page as a best effort.
  return 'pdf.worker.min.mjs';
}

export function ensurePdfWorker(): Promise<void> {
  workerInit ??= (async () => {
    const href = resolveWorkerHref();
    const res = await fetch(href);
    if (!res.ok) throw new Error(`pdf.js worker fetch failed (${res.status}): ${href}`);
    const source = await res.text();
    pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
      new Blob([source], { type: 'application/javascript' }),
    );
  })().catch((err: unknown) => {
    // Reset the singleton so a later PDF open retries past a transient failure.
    workerInit = null;
    throw err;
  });
  return workerInit;
}
