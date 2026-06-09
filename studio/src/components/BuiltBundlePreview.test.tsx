// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// The component's iframe srcdoc carries an inline error-reporting <script> and a
// <script src> at the (fake) built bundle. happy-dom would otherwise execute the
// inline script and fetch + run the URL; the empty response throws an async
// "Unexpected end of input" that surfaces as an unhandled rejection failing the
// run. We assert on the srcdoc *text* (the production browser runs it, not the
// test) and simulate the iframe's postMessage by hand, so script evaluation is
// disabled here — the test exercises the component's render + parent error path.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, within, cleanup, act } from '@testing-library/react';
import { BuiltBundlePreview, BUILT_PREVIEW_ERROR_TYPE } from './BuiltBundlePreview';

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
  it('renders an iframe whose srcdoc mounts the built IIFE for a built slug', () => {
    const { container } = render(<BuiltBundlePreview slug="built" />);
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    // a11y: the frame is labelled.
    expect(iframe.getAttribute('title')).toMatch(/built/i);

    const srcdoc = iframe.getAttribute('srcdoc') ?? '';
    // The mount target the IIFE's autoMount observes, keyed by slug…
    expect(srcdoc).toContain('data-perimeter-widget="built"');
    // …and the script tag pointing at the resolved bundle URL.
    expect(srcdoc).toContain('<script src="http://localhost/widgets/built/dist/index.js"');
  });

  it('wires the srcdoc to postMessage load/runtime errors to the parent', () => {
    const { container } = render(<BuiltBundlePreview slug="built" />);
    const iframe = container.querySelector('iframe') as HTMLIFrameElement;
    const srcdoc = iframe.getAttribute('srcdoc') ?? '';
    // The error channel is identified by a stable message type the parent filters on…
    expect(srcdoc).toContain(BUILT_PREVIEW_ERROR_TYPE);
    // …and the bundle script is wired to report a failure to load.
    expect(srcdoc).toContain('onerror');
    // …and uncaught runtime errors are surfaced too.
    expect(srcdoc).toContain('window.onerror');
  });

  it('renders a clear in-frame error when the bundle posts a load/runtime error', () => {
    const { container } = render(<BuiltBundlePreview slug="built" />);
    // Simulate the srcdoc iframe reporting a failure to the parent. The srcdoc
    // iframe is same-origin, so it can postMessage to window.parent.
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
