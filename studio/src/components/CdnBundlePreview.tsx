import { useEffect, useState } from 'react';
import { CDN_BASE_URL } from '../lib/catalog';
import { brandFontsLinkTag } from '../lib/brand-fonts';
import { serializeWidgetAttrs, type PreviewTheme } from '../lib/embed-snippet';
import { PREVIEW_FRAME_URL, usePreviewFrame } from '../lib/preview-frame';

/** postMessage type for frame→parent failure reports (the frame is same-origin). */
export const CDN_PREVIEW_ERROR_TYPE = 'perimeter-cdn-preview-error';

/**
 * The origin a shipped bundle calls when nothing overrides it — mirrors
 * `DEFAULT_API_URL` in @perimeter/widget-runtime. The impersonation fetch-shim
 * (below) rewrites requests to this origin onto the shell proxy.
 */
const PROD_API_ORIGIN = 'https://api.perimeter.org';

/**
 * A tiny script injected into the harness while impersonating that rewrites any
 * `fetch` to the default API origin onto the shell proxy. `data-api-url` alone is
 * not enough: a widget only picks it up if its config schema declares `apiUrl`
 * (Zod strips undeclared keys at mount), and e.g. my-giving-history does not — so
 * its api client falls back to the default origin and impersonation is ignored.
 * Patching fetch at the document level catches every widget regardless, without
 * touching the shipped bundles. Runs in <head> before the async loader mounts.
 */
function impersonationFetchShim(proxyBase: string): string {
  return [
    '<script>(function(){',
    `var P=${JSON.stringify(proxyBase)},D=${JSON.stringify(PROD_API_ORIGIN)};`,
    'var f=window.fetch.bind(window);',
    'window.fetch=function(input,init){try{',
    'var u=typeof input==="string"?input:(input&&input.url);',
    'if(u&&u.indexOf(D)===0){var r=P+u.slice(D.length);',
    'input=typeof input==="string"?r:new Request(r,input);}',
    '}catch(e){}return f(input,init);};',
    '})();</script>',
  ].join('');
}

interface CdnPreviewErrorMessage {
  type: typeof CDN_PREVIEW_ERROR_TYPE;
  slug: string;
  message: string;
}

function isCdnPreviewError(data: unknown): data is CdnPreviewErrorMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === CDN_PREVIEW_ERROR_TYPE &&
    typeof (data as { slug?: unknown }).slug === 'string' &&
    typeof (data as { message?: unknown }).message === 'string'
  );
}

/**
 * The bare host page written into the preview frame: the mount div plus the real
 * loader.js, exactly what a WordPress page carries. Exported so tests can assert
 * on the harness text directly — the frame receives it via `document.write`, so
 * there is no `srcdoc` attribute to read.
 *
 * The one thing this does NOT leave bare is fonts: it links the brand kit,
 * because the real host page (perimeter.org) loads one and a widget's CSS only
 * *names* sweet-sans-pro. Omitting it renders the preview in Inter. For a truly
 * bare host — no kit, no styles — use `pnpm embed-lab`.
 */
export function buildCdnPreviewHtml({
  slug,
  overrides,
  theme,
  apiUrl,
}: {
  slug: string;
  overrides: Record<string, unknown>;
  theme: PreviewTheme;
  apiUrl?: string | undefined;
}): string {
  const errorType = JSON.stringify(CDN_PREVIEW_ERROR_TYPE);
  const slugLiteral = JSON.stringify(slug);
  const loaderUrl = JSON.stringify(`${CDN_BASE_URL}/loader.js`);
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    // The brand faces. An iframe is its own document and inherits no fonts from
    // the studio, so without this the framed widget names sweet-sans-pro, fails
    // to find it, and renders the Inter fallback — a preview that quietly
    // misrepresents perimeter.org, which loads its own kit.
    brandFontsLinkTag(),
    '<style>html,body{margin:0;padding:0}</style>',
    '<script>',
    'function __report(message){',
    `try{parent.postMessage({type:${errorType},slug:${slugLiteral},message:String(message)},"*")}catch(e){}`,
    '}',
    'window.onerror=function(message,source,line,col,err){__report((err&&err.stack)||message);return false};',
    'window.addEventListener("unhandledrejection",function(e){__report("Unhandled rejection: "+((e.reason&&e.reason.message)||e.reason))});',
    '</script>',
    // Impersonation only: reroute default-origin API calls to the shell proxy so
    // widgets whose schema doesn't declare `apiUrl` still resolve on the target.
    apiUrl ? impersonationFetchShim(apiUrl) : '',
    '</head><body>',
    // Div before the loader script (BuiltBundlePreview's proven order). The
    // copyable snippet is script-first per the docs — functionally equivalent
    // here since the loader scans + observes the whole document.
    `<div ${serializeWidgetAttrs(slug, overrides, theme, apiUrl)}></div>`,
    `<script src=${loaderUrl} async onerror="__report('Failed to load loader.js: '+this.src)"></script>`,
    '</body></html>',
  ].join('');
}

/**
 * The catalog's live embed: the SHIPPED production bundle, loaded through the
 * real loader.js → manifest.json → immutable-bundle chain, inside a same-origin
 * iframe — exactly what a bare WordPress host page does, isolated from studio
 * React/CSS. Same failure channel as BuiltBundlePreview (a blank frame must
 * never fail silently). Prod-visible by design (BuiltBundlePreview stays
 * DEV-only). NEVER add `sandbox`: without allow-same-origin it forces an opaque
 * origin, localStorage throws, and MP sign-in can no longer reach the widget.
 *
 * The frame loads `PREVIEW_FRAME_URL` and the harness is written into it rather
 * than passed as `srcdoc`, so the framed page has a real hostname — see
 * ../lib/preview-frame.ts for why (reCAPTCHA cannot verify `about:srcdoc`).
 */
export function CdnBundlePreview({
  slug,
  overrides,
  theme,
  apiUrl,
}: {
  slug: string;
  overrides: Record<string, unknown>;
  theme: PreviewTheme;
  /** When impersonating, the shell proxy base — routes the shipped bundle's API
   * calls on behalf of the target. Same-origin srcdoc, so cookies flow. */
  apiUrl?: string | undefined;
}) {
  const [error, setError] = useState<string | null>(null);

  // Any change that regenerates the harness (slug, overrides, theme, apiUrl) gets
  // a fresh error slate — a stale banner over a healthy remount misleads.
  useEffect(() => {
    setError(null);
  }, [slug, overrides, theme, apiUrl]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (isCdnPreviewError(event.data) && event.data.slug === slug) {
        setError(event.data.message);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [slug]);

  const frameRef = usePreviewFrame(buildCdnPreviewHtml({ slug, overrides, theme, apiUrl }));

  return (
    <div className="relative min-h-[24rem] w-full">
      {error && (
        <div
          role="alert"
          className="absolute inset-x-0 top-0 z-10 space-y-1 bg-destructive px-4 py-3 text-left text-destructive-fg"
        >
          <p className="text-sm font-semibold">Shipped bundle failed to run</p>
          <p className="break-words text-xs">{error}</p>
        </div>
      )}
      <iframe
        title={`Live widget: ${slug}`}
        ref={frameRef}
        src={PREVIEW_FRAME_URL}
        className="block h-[70vh] w-full border-0 bg-white"
      />
    </div>
  );
}
