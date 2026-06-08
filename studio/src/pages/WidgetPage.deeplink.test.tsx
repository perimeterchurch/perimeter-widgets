// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, waitFor, cleanup, within, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { WidgetPage } from './WidgetPage';
import { PreviewPage } from './PreviewPage';
import { decodePreviewState } from '../lib/preview-link';

// Shareable preview links: the widget route encodes its tuned state (config
// overrides + theme + viewport) into the URL, a URL with params hydrates the
// preview, and the standalone /preview/:slug route renders just the widget. As
// with the other studio render tests, this suite has no global RTL cleanup and
// shims localStorage for the mount() path.

describe('WidgetPage deep-linkable preview', () => {
  afterEach(cleanup);

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

  // Probe that surfaces the live router location so the test can read the URL the
  // preview controls write to.
  let currentSearch = '';
  function LocationProbe() {
    const loc = useLocation();
    currentSearch = loc.search;
    return null;
  }

  function renderWidgetAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <LocationProbe />
        <Routes>
          <Route path="/widgets/:slug" element={<WidgetPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('changing a config field encodes it into the URL', async () => {
    const { container } = renderWidgetAt('/widgets/example');
    const scope = within(container);

    await waitFor(() => {
      expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
    });

    // Open the inspector and edit the example widget's greeting text field. The
    // Config tab has a single text input (greeting); count renders as a spinbutton.
    fireEvent.click(scope.getByRole('button', { name: /inspector/i }));
    const greeting = await waitFor(() => {
      const dialog = scope.getByRole('dialog', { name: /inspector/i });
      return within(dialog).getByRole('textbox');
    });
    fireEvent.change(greeting, { target: { value: 'Howdy' } });

    await waitFor(() => {
      const decoded = decodePreviewState(new URLSearchParams(currentSearch));
      expect(decoded.config.greeting).toBe('Howdy');
    });
  });

  it('hydrates the preview from URL params (config + theme)', async () => {
    const params = new URLSearchParams({
      config: JSON.stringify({ greeting: 'FromLink' }),
      theme: 'dark',
    });
    const { container } = renderWidgetAt(`/widgets/example?${params.toString()}`);
    const scope = within(container);

    await waitFor(() => {
      expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
    });

    // The canvas Theme control reflects the hydrated dark theme.
    const themeGroup = scope.getByRole('group', { name: /theme/i });
    expect(
      within(themeGroup).getByRole('button', { name: /dark/i }).getAttribute('aria-pressed'),
    ).toBe('true');

    // The inspector's greeting field reflects the hydrated config value.
    fireEvent.click(scope.getByRole('button', { name: /inspector/i }));
    const greeting = await waitFor(() => {
      const dialog = scope.getByRole('dialog', { name: /inspector/i });
      return within(dialog).getByRole<HTMLInputElement>('textbox');
    });
    expect(greeting.value).toBe('FromLink');
  });

  it('selecting a non-default canvas surface encodes bg into the URL', async () => {
    const { container } = renderWidgetAt('/widgets/example');
    const scope = within(container);

    await waitFor(() => {
      expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
    });

    const surfaceGroup = within(scope.getByRole('group', { name: /surface/i }));
    fireEvent.click(surfaceGroup.getByRole('button', { name: /^white$/i }));

    await waitFor(() => {
      expect(decodePreviewState(new URLSearchParams(currentSearch)).background).toBe('white');
    });
  });

  it('hydrates the canvas surface from a bg= param', async () => {
    const { container } = renderWidgetAt('/widgets/example?bg=dark');
    const scope = within(container);

    await waitFor(() => {
      expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
    });

    // The Surface group has a "Dark" option AND so does Theme — scope to the group.
    const surfaceGroup = within(scope.getByRole('group', { name: /surface/i }));
    expect(surfaceGroup.getByRole('button', { name: /^dark$/i }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });
});

describe('standalone preview route (/preview/:slug)', () => {
  afterEach(cleanup);

  function renderPreviewAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/preview/:slug" element={<PreviewPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders just the widget preview, with no inspector or canvas chrome', async () => {
    const { container } = renderPreviewAt('/preview/example');
    const scope = within(container);

    await waitFor(() => {
      expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
    });

    // Full-bleed standalone surface; no studio chrome.
    expect(container.querySelector('[data-standalone-preview]')).toBeTruthy();
    expect(scope.queryByRole('button', { name: /inspector/i })).toBeNull();
    expect(scope.queryByRole('group', { name: /surface/i })).toBeNull();
  });

  it('applies the viewport width from the URL', async () => {
    const { container } = renderPreviewAt('/preview/example?viewport=375');
    await waitFor(() => {
      expect(container.querySelector('[data-perimeter-widget-preview]')).toBeTruthy();
    });
    const frame = container.querySelector('[data-preview-frame]') as HTMLElement;
    expect(frame.style.width).toBe('375px');
  });

  it('renders the 404 page for an unknown slug', () => {
    const { container } = renderPreviewAt('/preview/does-not-exist');
    expect(within(container).getByText('Page not found')).toBeTruthy();
    expect(container.querySelector('[data-perimeter-widget-preview]')).toBeNull();
  });
});
