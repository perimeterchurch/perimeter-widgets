import { Card, CardContent } from '@perimeter/ui/card';
import { builtBundleUrl } from '../lib/built-bundles';

/**
 * Dev-only preview of a widget's *shipped* artifact — the actual built IIFE from
 * `widgets/<slug>/dist/index.js`, the byte-for-byte file the CDN serves. This is
 * the final pre-release parity check: source-mounted previews use the dev React
 * + dev CSS pipeline, while this runs the production bundle exactly as a host
 * page would.
 *
 * Why an iframe: the built IIFE calls `autoMount`, which observes `document.body`
 * globally and instantiates its own React. Running it in the studio's own document
 * would collide with the studio's React tree and global observers. An iframe gives
 * the bundle its own document/window — the parity-honest sandbox — so it mounts
 * exactly as it does on a real host page.
 *
 * Gated behind `import.meta.env.DEV` by its only caller (Canvas), so Rollup
 * tree-shakes the whole feature out of the deployed read-only site.
 */
export function BuiltBundlePreview({ slug }: { slug: string }) {
  const url = builtBundleUrl(slug);

  if (!url) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="space-y-2 p-6 text-center">
          <p className="text-sm font-semibold text-fg">Build the widget first</p>
          <p className="text-sm text-muted-fg">
            No built bundle was found for this widget. Build it, then switch back to this view to
            preview the shipped artifact.
          </p>
          <pre className="mt-1 overflow-x-auto rounded-md bg-fg px-3 py-2 text-left font-mono text-xs leading-relaxed text-bg">
            pnpm --filter ./widgets/{slug} build
          </pre>
        </CardContent>
      </Card>
    );
  }

  // Minimal host document: the mount target the IIFE's autoMount observes, keyed
  // by slug, plus the bundle script. `margin:0` so the widget owns the frame; the
  // canvas already supplies background + viewport-width framing around the iframe.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}</style></head><body><div data-perimeter-widget="${slug}"></div><script src="${url}"></script></body></html>`;

  return (
    <iframe
      title={`Built bundle preview: ${slug}`}
      srcDoc={srcDoc}
      // Fill the canvas frame; the canvas constrains the outer width via presets.
      className="block h-[70vh] w-full border-0 bg-white"
    />
  );
}
