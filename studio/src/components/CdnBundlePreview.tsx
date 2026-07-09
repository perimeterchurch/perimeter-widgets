import { useEffect, useState } from 'react';
import { CDN_BASE_URL } from '../lib/catalog';
import { serializeWidgetAttrs, type PreviewTheme } from '../lib/embed-snippet';

/** postMessage type for srcdoc→parent failure reports (same-origin srcdoc). */
export const CDN_PREVIEW_ERROR_TYPE = 'perimeter-cdn-preview-error';

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
 * The catalog's live embed: the SHIPPED production bundle, loaded through the
 * real loader.js → manifest.json → immutable-bundle chain, inside a same-origin
 * srcdoc iframe — exactly what a bare WordPress host page does, isolated from
 * studio React/CSS. Same failure channel as BuiltBundlePreview (a blank frame
 * must never fail silently). Prod-visible by design (BuiltBundlePreview stays
 * DEV-only). NEVER add `sandbox`: without allow-same-origin it forces an opaque
 * origin, localStorage throws, and MP sign-in can no longer reach the widget.
 */
export function CdnBundlePreview({
  slug,
  overrides,
  theme,
}: {
  slug: string;
  overrides: Record<string, unknown>;
  theme: PreviewTheme;
}) {
  const [error, setError] = useState<string | null>(null);

  // Any change that regenerates the srcdoc (slug, overrides, theme) gets a
  // fresh error slate — a stale banner over a healthy remount misleads.
  useEffect(() => {
    setError(null);
  }, [slug, overrides, theme]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (isCdnPreviewError(event.data) && event.data.slug === slug) {
        setError(event.data.message);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [slug]);

  const errorType = JSON.stringify(CDN_PREVIEW_ERROR_TYPE);
  const slugLiteral = JSON.stringify(slug);
  const loaderUrl = JSON.stringify(`${CDN_BASE_URL}/loader.js`);
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
    // Div before the loader script (BuiltBundlePreview's proven order). The
    // copyable snippet is script-first per the docs — functionally equivalent
    // here since the loader scans + observes the whole document.
    `<div ${serializeWidgetAttrs(slug, overrides, theme)}></div>`,
    `<script src=${loaderUrl} async onerror="__report('Failed to load loader.js: '+this.src)"></script>`,
    '</body></html>',
  ].join('');

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
        srcDoc={srcDoc}
        className="block h-[70vh] w-full border-0 bg-white"
      />
    </div>
  );
}
