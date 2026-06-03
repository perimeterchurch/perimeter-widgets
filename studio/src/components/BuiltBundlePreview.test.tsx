// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import { BuiltBundlePreview } from './BuiltBundlePreview';

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

  it('renders a build hint (not a broken frame) for a slug with no dist', () => {
    const { container } = render(<BuiltBundlePreview slug="unbuilt" />);
    expect(container.querySelector('iframe')).toBeNull();
    // The hint names the build command for the missing widget.
    expect(within(container).getByText(/build the widget first/i)).toBeTruthy();
    expect(within(container).getByText(/widgets\/unbuilt/)).toBeTruthy();
  });
});
