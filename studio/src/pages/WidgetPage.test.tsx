// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, waitFor, cleanup, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { WidgetPage } from './WidgetPage';

// Render-path regression guard for the widget route. typecheck/build pass even
// when the page crashes at runtime, so exercise the actual render through the
// router (so useParams resolves :slug) against the real discovery globs — they
// resolve against repo root in tests the same way they do in the dev server.

describe('WidgetPage (/widgets/:slug)', () => {
  // This suite has no global RTL auto-cleanup; unmount our render so the mounted
  // WidgetPreview host does not leak into later tests' shared document.
  afterEach(cleanup);

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
    await waitFor(() => {
      expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
    });

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

  it('renders the 404 page for an unknown slug', () => {
    const { container } = renderAt('/widgets/does-not-exist');
    expect(within(container).getByText('Page not found')).toBeTruthy();
    expect(container.querySelector('[data-perimeter-widget-preview]')).toBeNull();
  });
});
