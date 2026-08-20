// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// The component's harness carries an inline error-reporting <script> and a
// <script src> at the (fake) built bundle. happy-dom would otherwise execute the
// inline script and fetch + run the URL; the empty response throws an async
// "Unexpected end of input" that surfaces as an unhandled rejection failing the
// run. We assert on the harness *text* via `buildBuiltPreviewHtml` (the
// production browser runs it, not the test — and the frame receives it through
// document.write, so there is no srcdoc attribute to read) and simulate the
// iframe's postMessage by hand, so script evaluation is disabled here — the test
// exercises the component's render + parent error path.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, within, cleanup, act } from '@testing-library/react';
import {
  BuiltBundlePreview,
  BUILT_PREVIEW_ERROR_TYPE,
  buildBuiltPreviewHtml,
} from './BuiltBundlePreview';
import { BRAND_FONTS_CSS_URL } from '../lib/brand-fonts';
import { PREVIEW_FRAME_URL } from '../lib/preview-frame';

const BUILT_URL = 'http://localhost/widgets/built/dist/index.js';

// Mock built-bundle discovery so the test does not depend on a real on-disk dist.
// `built` resolves to a fake URL; any other slug resolves to null (not built yet).
vi.mock('../lib/built-bundles', () => ({
  builtBundleUrl: (slug: string) =>
    slug === 'built' ? 'http://localhost/widgets/built/dist/index.js' : null,
}));

// The studio suite has no global RTL auto-cleanup; unmount between tests so the
// rendered iframe/hint does not leak into later renders' shared document.
afterEach(cleanup);

describe('BuiltBundlePreview', () => {
  it('renders a labelled frame that loads a real same-origin URL (not srcdoc)', () => {
    const { container } = render(<BuiltBundlePreview slug="built" />);
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    // a11y: the frame is labelled.
    expect(iframe.getAttribute('title')).toMatch(/built/i);
    // A srcdoc frame has no URL and therefore no hostname, which breaks anything
    // verifying the page origin inside it (reCAPTCHA most visibly).
    expect(iframe.getAttribute('src')).toBe(PREVIEW_FRAME_URL);
    expect(iframe.hasAttribute('srcdoc')).toBe(false);
  });

  it('builds a harness that mounts the built IIFE for a built slug', () => {
    const html = buildBuiltPreviewHtml({ slug: 'built', url: BUILT_URL });
    // The mount target the IIFE's autoMount observes, keyed by slug…
    expect(html).toContain('data-perimeter-widget="built"');
    // …and the script tag pointing at the resolved bundle URL.
    expect(html).toContain(`<script src="${BUILT_URL}"`);
  });

  it('links the brand fonts inside the frame', () => {
    // Fonts are document-scoped: studio/index.html's kit covers shadow-root
    // previews but not an iframe, which needs its own link or the widget falls
    // back to Inter.
    expect(buildBuiltPreviewHtml({ slug: 'built', url: BUILT_URL })).toContain(BRAND_FONTS_CSS_URL);
  });

  it('wires the harness to postMessage load/runtime errors to the parent', () => {
    const html = buildBuiltPreviewHtml({ slug: 'built', url: BUILT_URL });
    // The error channel is identified by a stable message type the parent filters on…
    expect(html).toContain(BUILT_PREVIEW_ERROR_TYPE);
    // …and the bundle script is wired to report a failure to load.
    expect(html).toContain('onerror');
    // …and uncaught runtime errors are surfaced too.
    expect(html).toContain('window.onerror');
  });

  it('renders a clear in-frame error when the bundle posts a load/runtime error', () => {
    const { container } = render(<BuiltBundlePreview slug="built" />);
    // Simulate the preview iframe reporting a failure to the parent. The frame
    // is same-origin, so it can postMessage to window.parent.
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: BUILT_PREVIEW_ERROR_TYPE,
            slug: 'built',
            message: 'Failed to load bundle script',
          },
        }),
      );
    });
    // The error is surfaced visibly (not a silent/blank failure).
    expect(within(container).getByText(/failed to load bundle script/i)).toBeTruthy();
    // The iframe stays present so the user can still inspect/retry, but the error
    // is shown alongside it.
    expect(within(container).getByText(/built bundle failed/i)).toBeTruthy();
  });

  it('ignores error messages for a different slug', () => {
    const { container } = render(<BuiltBundlePreview slug="built" />);
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: BUILT_PREVIEW_ERROR_TYPE,
            slug: 'someone-else',
            message: 'unrelated error',
          },
        }),
      );
    });
    expect(within(container).queryByText(/unrelated error/i)).toBeNull();
  });

  it('renders a build hint (not a broken frame) for a slug with no dist', () => {
    const { container } = render(<BuiltBundlePreview slug="unbuilt" />);
    expect(container.querySelector('iframe')).toBeNull();
    // The hint names the build command for the missing widget.
    expect(within(container).getByText(/build the widget first/i)).toBeTruthy();
    expect(within(container).getByText(/widgets\/unbuilt/)).toBeTruthy();
  });
});
