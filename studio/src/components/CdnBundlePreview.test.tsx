// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// Same reason as BuiltBundlePreview.test.tsx: happy-dom would otherwise execute
// the srcdoc's inline script AND fetch + run the loader.js URL (real network /
// unhandled rejection). All assertions read the srcdoc *text*; the iframe's
// postMessage is simulated by hand.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { CdnBundlePreview, CDN_PREVIEW_ERROR_TYPE } from './CdnBundlePreview';

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

  it('regenerates the srcdoc when overrides change', () => {
    const { container, rerender } = render(
      <CdnBundlePreview slug="sermons" overrides={{}} theme="light" />,
    );
    rerender(<CdnBundlePreview slug="sermons" overrides={{ perPage: 9 }} theme="light" />);
    expect(frameSrcdoc(container)).toContain('data-per-page="9"');
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
