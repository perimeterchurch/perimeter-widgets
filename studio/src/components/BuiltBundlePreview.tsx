import { useEffect, useState } from 'react';
import { Card, CardContent } from '@perimeter/ui/card';
import { builtBundleUrl } from '../lib/built-bundles';

/**
 * postMessage type the srcdoc iframe uses to report a load/runtime failure to the
 * parent studio. The srcdoc iframe is same-origin (it has no `src`, so it inherits
 * the parent's origin), so `window.parent.postMessage` reaches the studio and the
 * parent can read `event.data` without a cross-origin guard. Exported so the parent
 * listener and the render test agree on one stable identifier.
 */
export const BUILT_PREVIEW_ERROR_TYPE = 'perimeter-built-preview-error';

interface BuiltPreviewErrorMessage {
  type: typeof BUILT_PREVIEW_ERROR_TYPE;
  slug: string;
  message: string;
}

function isBuiltPreviewError(data: unknown): data is BuiltPreviewErrorMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === BUILT_PREVIEW_ERROR_TYPE &&
    typeof (data as { slug?: unknown }).slug === 'string' &&
    typeof (data as { message?: unknown }).message === 'string'
  );
}

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
 * Failure surfacing: the built bundle runs in a sandboxed document where a load
 * failure (stale/missing `dist`, a `?url` 404) or a runtime throw is otherwise
 * invisible — the frame just renders blank. The srcdoc installs a `window.onerror`
 * handler and an `onerror` on the bundle script that `postMessage` the failure to
 * the parent (same-origin srcdoc), and this component listens and renders a clear
 * in-frame error banner instead of a silent blank frame. It also flags a dev-built
 * (`pnpm dev` watch) bundle, which crashes under the production `NODE_ENV` the
 * runtime defines.
 *
 * Gated behind `import.meta.env.DEV` by its only caller (Canvas), so Rollup
 * tree-shakes the whole feature out of the deployed read-only site.
 */
export function BuiltBundlePreview({ slug }: { slug: string }) {
  const url = builtBundleUrl(slug);
  const [error, setError] = useState<string | null>(null);

  // Reset any prior error when the previewed widget changes.
  useEffect(() => {
    setError(null);
  }, [slug, url]);

  // Listen for failures the srcdoc iframe reports. The srcdoc iframe is same-origin,
  // so its `window.parent.postMessage` arrives here; filter by message type + slug
  // so an unrelated frame's message can't spoof this preview's error state.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (isBuiltPreviewError(event.data) && event.data.slug === slug) {
        setError(event.data.message);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [slug]);

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

  // Minimal host document for the shipped IIFE. The mount target the bundle's
  // autoMount observes (keyed by slug), `margin:0` so the widget owns the frame,
  // and an error channel: a `window.onerror` handler plus the bundle script's own
  // `onerror` both postMessage the failure to the parent so a blank/crashed frame
  // is reported instead of failing silently. The JSON-encoded type + slug keep the
  // injected script free of unescaped interpolation.
  const errorType = JSON.stringify(BUILT_PREVIEW_ERROR_TYPE);
  const slugLiteral = JSON.stringify(slug);
  const scriptUrl = JSON.stringify(url);
  const srcDoc = [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<style>html,body{margin:0;padding:0}</style>',
    '<script>',
    'function __report(message){',
    `try{parent.postMessage({type:${errorType},slug:${slugLiteral},message:String(message)},"*")}catch(e){}`,
    '}',
    'window.onerror=function(message,source,line,col,err){__report((err&&err.stack)||message);return false};',
    'window.addEventListener("unhandledrejection",function(e){__report("Unhandled rejection: "+((e.reason&&e.reason.message)||e.reason))});',
    '</script>',
    '</head><body>',
    `<div data-perimeter-widget=${slugLiteral}></div>`,
    // `this.src` is the script element itself, so the failure message reports the
    // real URL without interpolating it into the attribute (which would break the
    // double-quoted attribute if the URL contained a quote).
    `<script src=${scriptUrl} onerror="__report('Failed to load bundle script: '+this.src)"></script>`,
    '</body></html>',
  ].join('');

  return (
    <div className="relative h-[70vh] w-full">
      {error && (
        <div
          role="alert"
          className="absolute inset-x-0 top-0 z-10 space-y-1 bg-destructive px-4 py-3 text-left text-destructive-fg"
        >
          <p className="text-sm font-semibold">Built bundle failed to run</p>
          <p className="break-words text-xs">{error}</p>
          <p className="text-xs opacity-90">
            Rebuild with <code className="font-mono">pnpm --filter ./widgets/{slug} build</code> (a{' '}
            <code className="font-mono">pnpm dev</code> watch build crashes under production
            <code className="font-mono"> NODE_ENV</code>), then reload.
          </p>
        </div>
      )}
      <iframe
        title={`Built bundle preview: ${slug}`}
        srcDoc={srcDoc}
        // Fill the canvas frame; the canvas constrains the outer width via presets.
        className="block h-full w-full border-0 bg-white"
      />
    </div>
  );
}
