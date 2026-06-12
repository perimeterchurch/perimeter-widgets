import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { widgetConfig } from '@perimeter/vite-plugin-widget';

const require = createRequire(import.meta.url);

/**
 * Ship pdf.js's worker as a sibling dist artifact instead of inlined bundle
 * bytes (~288 KB gz, 37% of the bundle — guarded by tests/bundle.test.ts).
 * Emitted from the SAME pdfjs-dist install the bundle compiles against, so the
 * API/worker version pair can never drift (tests/…/pdf-worker-version.test.ts
 * pins the react-pdf side). The release CLI copies dist/ recursively, so the
 * file rides into the immutable cdn/<name>/<version>/ dir, where
 * src/lib/pdf-worker.ts resolves it at runtime from the bundle's own script
 * URL. emitFile (not an asset import) because Vite lib mode inlines imported
 * assets as data URLs.
 */
const emitPdfWorker: Plugin = {
  name: 'sermons:emit-pdf-worker',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'pdf.worker.min.mjs',
      source: readFileSync(require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'), 'utf8'),
    });
  },
};

const config = widgetConfig({ name: 'sermons' });

export default defineConfig({
  ...config,
  plugins: [...(config.plugins ?? []), emitPdfWorker],
});
