import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Embed lab — a local host-page playground for manually testing widget embeds.
 *
 * Serves two artifact sources behind one origin so the test pages in `pages/`
 * can exercise both:
 *
 *  - RELEASED:  `/loader.js`, `/manifest.json`, `/<name>/<version>/*` are
 *    passthroughs to the repo's committed `cdn/` directory — byte-for-byte
 *    what widgets.perimeter.org serves, including the manifest-driven loader
 *    flow and sibling artifacts (e.g. sermons' pdf.worker.min.mjs).
 *  - LOCAL:     `/local/<name>/*` serves `widgets/<name>/dist/` — the
 *    not-yet-released build of a widget (run its build first).
 *
 * Everything is `no-store` so a fresh release or rebuild shows on reload.
 * Widgets fetch real data from https://api.perimeter.org (the built bundle's
 * default API base), so pages need internet access; add `data-api-url` to a
 * placeholder to point at a local perimeter-api instead.
 */

export const EMBED_LAB_PORT = 4400;

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const cdnDir = path.join(repoRoot, 'cdn');
const widgetsDir = path.join(repoRoot, 'widgets');
const pagesDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../pages');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Resolve `rel` inside `root`, refusing path traversal; null when absent. */
function fileIn(root: string, rel: string): string | null {
  const abs = path.resolve(root, '.' + path.sep + rel);
  if (!abs.startsWith(root + path.sep)) return null;
  return existsSync(abs) ? abs : null;
}

export function startEmbedLab(port = EMBED_LAB_PORT): Server {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
    const send = (code: number, type: string, body: string | Buffer) => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };
    const sendFile = (abs: string) =>
      send(200, MIME[path.extname(abs)] ?? 'application/octet-stream', readFileSync(abs));

    // Test pages: / is the directory; /pages/<name>.html are the scenarios.
    if (url === '/' || url === '/index.html') {
      return sendFile(path.join(pagesDir, 'index.html'));
    }
    if (url.startsWith('/pages/')) {
      const abs = fileIn(pagesDir, url.slice('/pages/'.length));
      if (abs) return sendFile(abs);
      return send(404, 'text/plain', 'no such page');
    }

    // LOCAL builds: /local/<name>/<file…> → widgets/<name>/dist/<file…>.
    const local = /^\/local\/([\w-]+)\/(.+)$/.exec(url);
    if (local) {
      const abs = fileIn(path.join(widgetsDir, local[1]!, 'dist'), local[2]!);
      if (abs) return sendFile(abs);
      return send(
        404,
        'text/plain',
        `no local build for "${local[1]}" — run: pnpm --filter @perimeter/widget-${local[1]} build`,
      );
    }

    // RELEASED artifacts: everything else is a passthrough to the repo cdn/.
    const abs = fileIn(cdnDir, url.slice(1));
    if (abs) return sendFile(abs);
    return send(404, 'text/plain', 'not found');
  });
  server.listen(port);
  return server;
}

// Direct invocation: `pnpm embed-lab` (root) / `pnpm serve` (this package).
// pathToFileURL, not `new URL(argv[1], 'file://')`: argv[1] is a native path, so
// on Windows it is "C:\…\serve.ts", which that form does not turn into the
// "file:///C:/…" shape import.meta.url has. The comparison silently failed and
// the server never started — the command just exited 0 with no output.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startEmbedLab();
  console.log(`Embed lab → http://localhost:${EMBED_LAB_PORT}`);
}
