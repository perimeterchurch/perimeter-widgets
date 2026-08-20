// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// Same reason as BuiltBundlePreview.test.tsx: happy-dom would otherwise execute
// the harness's inline script AND fetch + run the loader.js URL (real network /
// unhandled rejection). The harness is asserted through `buildCdnPreviewHtml`
// (the frame receives it via document.write, so there is no srcdoc attribute to
// read); the iframe's postMessage is simulated by hand.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { CdnBundlePreview, CDN_PREVIEW_ERROR_TYPE, buildCdnPreviewHtml } from './CdnBundlePreview';
import { BRAND_FONTS_CSS_URL } from '../lib/brand-fonts';
import { PREVIEW_FRAME_URL } from '../lib/preview-frame';

afterEach(cleanup);

function frame(container: HTMLElement): HTMLIFrameElement {
  const el = container.querySelector('iframe');
  expect(el).toBeTruthy();
  expect(el!.hasAttribute('sandbox')).toBe(false); // shared-origin localStorage is load-bearing
  return el as HTMLIFrameElement;
}

describe('CdnBundlePreview', () => {
  // The regression this guards: a `srcdoc` frame has no URL, so no hostname, and
  // reCAPTCHA's execute() returns an error token from inside it — the
  // staff-contact form could never be submitted from the studio. The frame must
  // load a real same-origin URL and have the harness written in.
  it('loads a real same-origin URL rather than using srcdoc', () => {
    const { container } = render(<CdnBundlePreview slug="sermons" overrides={{}} theme="light" />);
    const el = frame(container);
    expect(el.getAttribute('src')).toBe(PREVIEW_FRAME_URL);
    expect(el.hasAttribute('srcdoc')).toBe(false);
  });

  it('builds a host page with the real loader and the serialized attrs', () => {
    const html = buildCdnPreviewHtml({
      slug: 'sermons',
      overrides: { perPage: 5 },
      theme: 'dark',
    });
    expect(html).toContain('https://widgets.perimeter.org/loader.js');
    expect(html).toContain(
      '<div data-perimeter-widget="sermons" data-per-page="5" data-theme="dark"></div>',
    );
    expect(html).not.toContain('data-nowprocket'); // WP-Rocket hint is snippet-only
  });

  it('links the brand fonts inside the frame', () => {
    // An iframe is its own document and inherits no fonts from the studio, so
    // studio/index.html's kit does not reach it. Without this link the framed
    // widget names sweet-sans-pro, does not find it, and renders Inter — a
    // preview that misrepresents perimeter.org, which loads its own kit.
    expect(buildCdnPreviewHtml({ slug: 'sermons', overrides: {}, theme: 'light' })).toContain(
      BRAND_FONTS_CSS_URL,
    );
  });

  it('regenerates the harness when overrides change', () => {
    expect(
      buildCdnPreviewHtml({ slug: 'sermons', overrides: { perPage: 9 }, theme: 'light' }),
    ).toContain('data-per-page="9"');
  });

  it('omits the impersonation fetch-shim when no apiUrl is given', () => {
    const html = buildCdnPreviewHtml({ slug: 'sermons', overrides: {}, theme: 'light' });
    expect(html).not.toContain('window.fetch=');
    expect(html).not.toContain('data-api-url');
  });

  it('injects the fetch-shim + data-api-url when impersonating (apiUrl set)', () => {
    const proxy = 'http://localhost:5173/api/impersonate/data';
    const html = buildCdnPreviewHtml({
      slug: 'my-giving-history',
      overrides: {},
      theme: 'light',
      apiUrl: proxy,
    });
    // Shipped bundle picks it up only if it declares `apiUrl`; the shim covers
    // the ones that don't by rewriting default-origin calls onto the proxy.
    expect(html).toContain(`data-api-url="${proxy}"`);
    expect(html).toContain('window.fetch=');
    expect(html).toContain(JSON.stringify(proxy));
    expect(html).toContain(JSON.stringify('https://api.perimeter.org'));
  });

  it('shows an error banner when the frame posts a failure', () => {
    const { container, getByRole } = render(
      <CdnBundlePreview slug="sermons" overrides={{}} theme="light" />,
    );
    // Deterministic, same pattern as BuiltBundlePreview.test.tsx — happy-dom's
    // real postMessage dispatches async outside act.
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: CDN_PREVIEW_ERROR_TYPE,
            slug: 'sermons',
            message: 'Failed to load loader.js',
          },
        }),
      );
    });
    expect(getByRole('alert').textContent).toContain('Failed to load');
    expect(container.querySelector('iframe')).toBeTruthy();
  });
});
