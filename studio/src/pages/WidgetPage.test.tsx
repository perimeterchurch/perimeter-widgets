// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor, cleanup, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { WidgetPage } from './WidgetPage';

// Render-path regression guard for the widget route. typecheck/build pass even
// when the page crashes at runtime, so exercise the actual render through the
// router (so useParams resolves :slug) against the real discovery globs — they
// resolve against repo root in tests the same way they do in the dev server.
//
// This file covers the DEV tab (source mount through the real mount()), which
// needs script evaluation. The Embed tab lives in WidgetPage.embed.test.tsx,
// where evaluation is disabled — its iframe would otherwise fetch and run the
// real loader.js.
//
// The page reads the CDN manifest to decide whether an Embed tab is possible, so
// fetch is stubbed: unit tests must not reach widgets.perimeter.org. `example` is
// deliberately absent from the fixture manifest (joinCatalog filters it anyway),
// making it the unreleased/source-only case.

describe('WidgetPage (/widgets/:slug)', () => {
  // This suite has no global RTL auto-cleanup; unmount our render so the mounted
  // WidgetPreview host does not leak into later tests' shared document.
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ sermons: '1.4.3' }) }),
    );
  });

  // mount() unconditionally constructs MPLocalStorageAuth, which reads localStorage;
  // the test worker leaves it undefined. Mirror render.test.tsx's in-memory shim.
  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
          clear: () => store.clear(),
          key: () => null,
          get length() {
            return store.size;
          },
        },
      });
    }
  });

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/widgets/:slug" element={<WidgetPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('mounts the real preview host and shows the exact embed snippet for a known slug', async () => {
    const { container } = renderAt('/widgets/example');
    const scope = within(container);

    // The widget module/css load async, then WidgetPreview mounts the real host.
    // 10s, not waitFor's 1s default: this awaits the lazily imported widget
    // definition + its mount, which exceeds a second on a 2-core CI runner.
    await waitFor(
      () => {
        expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
      },
      { timeout: 10_000 },
    );

    // The inspector (which carries the embed snippet) is a closed-by-default
    // slide-out drawer now — open it via its header toggle before asserting.
    fireEvent.click(scope.getByRole('button', { name: /inspector/i }));

    // The embed snippet is the production CDN host/path — assert the exact string
    // carried over from the old App.tsx, not an invented one.
    const snippet = scope.getByText(
      (_text, node) =>
        node?.tagName === 'PRE' &&
        (node.textContent ?? '').includes('https://widgets.perimeter.org/example/latest.js'),
    );
    expect(snippet.textContent).toBe(
      '<div data-perimeter-widget="example"></div>\n' +
        '<script src="https://widgets.perimeter.org/example/latest.js" async></script>',
    );
  });

  it('renders the 404 page for an unknown slug', async () => {
    const { container } = renderAt('/widgets/does-not-exist');
    // Async now: the page waits for the manifest before concluding a slug is
    // unknown, rather than flashing a 404 at a widget that turns out released.
    const scope = within(container);
    expect(await scope.findByText('Page not found', undefined, { timeout: 10_000 })).toBeTruthy();
    expect(container.querySelector('[data-perimeter-widget-preview]')).toBeNull();
  });

  it('shows no tab strip for an unreleased widget — Dev is its only view', async () => {
    const { container } = renderAt('/widgets/example');
    const scope = within(container);
    await waitFor(
      () => {
        expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
      },
      { timeout: 10_000 },
    );
    expect(scope.queryByRole('tablist')).toBeNull();
    // And it says so, rather than showing a version it does not have.
    expect(scope.getByText('not released')).toBeTruthy();
  });
});
