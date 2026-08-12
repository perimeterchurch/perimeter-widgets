// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// Same reason as BuiltBundlePreview.test.tsx: happy-dom would otherwise execute
// the srcdoc's inline script AND fetch + run the loader.js URL (real network /
// unhandled rejection). All assertions read the srcdoc *text*; the iframe's
// postMessage is simulated by hand.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { CdnBundlePreview, CDN_PREVIEW_ERROR_TYPE } from './CdnBundlePreview';
import { BRAND_FONTS_CSS_URL } from '../lib/brand-fonts';

afterEach(cleanup);

function frameSrcdoc(container: HTMLElement): string {
  const frame = container.querySelector('iframe');
  expect(frame).toBeTruthy();
  expect(frame!.hasAttribute('sandbox')).toBe(false); // shared-origin localStorage is load-bearing
  return frame!.getAttribute('srcdoc') ?? '';
}

describe('CdnBundlePreview', () => {
  it('renders a srcdoc host page with the real loader and the serialized attrs', () => {
    const { container } = render(
      <CdnBundlePreview slug="sermons" overrides={{ perPage: 5 }} theme="dark" />,
    );
    const srcdoc = frameSrcdoc(container);
    expect(srcdoc).toContain('https://widgets.perimeter.org/loader.js');
    expect(srcdoc).toContain(
      '<div data-perimeter-widget="sermons" data-per-page="5" data-theme="dark"></div>',
    );
    expect(srcdoc).not.toContain('data-nowprocket'); // WP-Rocket hint is snippet-only
  });

  it('links the brand fonts inside the frame', () => {
    // An iframe is its own document and inherits no fonts from the studio, so
    // studio/index.html's kit does not reach it. Without this link the framed
    // widget names sweet-sans-pro, does not find it, and renders Inter — a
    // preview that misrepresents perimeter.org, which loads its own kit.
    const { container } = render(<CdnBundlePreview slug="sermons" overrides={{}} theme="light" />);
    expect(frameSrcdoc(container)).toContain(BRAND_FONTS_CSS_URL);
  });

  it('regenerates the srcdoc when overrides change', () => {
    const { container, rerender } = render(
      <CdnBundlePreview slug="sermons" overrides={{}} theme="light" />,
    );
    rerender(<CdnBundlePreview slug="sermons" overrides={{ perPage: 9 }} theme="light" />);
    expect(frameSrcdoc(container)).toContain('data-per-page="9"');
  });

  it('omits the impersonation fetch-shim when no apiUrl is given', () => {
    const { container } = render(<CdnBundlePreview slug="sermons" overrides={{}} theme="light" />);
    const srcdoc = frameSrcdoc(container);
    expect(srcdoc).not.toContain('window.fetch=');
    expect(srcdoc).not.toContain('data-api-url');
  });

  it('injects the fetch-shim + data-api-url when impersonating (apiUrl set)', () => {
    const proxy = 'http://localhost:5173/api/impersonate/data';
    const { container } = render(
      <CdnBundlePreview slug="my-giving-history" overrides={{}} theme="light" apiUrl={proxy} />,
    );
    const srcdoc = frameSrcdoc(container);
    // Shipped bundle picks it up only if it declares `apiUrl`; the shim covers
    // the ones that don't by rewriting default-origin calls onto the proxy.
    expect(srcdoc).toContain(`data-api-url="${proxy}"`);
    expect(srcdoc).toContain('window.fetch=');
    expect(srcdoc).toContain(JSON.stringify(proxy));
    expect(srcdoc).toContain(JSON.stringify('https://api.perimeter.org'));
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
