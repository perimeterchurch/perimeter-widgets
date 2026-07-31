// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, within, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppHeader } from './AppHeader';

// The studio suite has no global RTL auto-cleanup; unmount between tests.
afterEach(cleanup);

// AppHeader uses useStudioTheme, which persists to localStorage; happy-dom in
// this worker leaves it undefined. Mirror the in-memory shim used elsewhere.
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

function renderHeader(navOpen = false) {
  const onNavOpenChange = vi.fn();
  const utils = render(
    <MemoryRouter>
      <AppHeader navOpen={navOpen} onNavOpenChange={onNavOpenChange} />
    </MemoryRouter>,
  );
  return { ...utils, ui: within(utils.container), onNavOpenChange };
}

describe('AppHeader', () => {
  it('renders the two-part wordmark linking home', () => {
    const { ui } = renderHeader();
    const brand = ui.getByRole('link', { name: /perimeter studio/i });
    expect(brand.getAttribute('href')).toBe('/');
  });

  it('sets the brand word in the wordmark serif, not the chrome sans', () => {
    // The KB's lockup is Playfair for "Perimeter" + the UI face for the subsite
    // name. Scoped to this span on purpose — it must not leak to body text.
    const { ui } = renderHeader();
    const word = ui.getByText('Perimeter');
    expect(word.className).toContain('font-studio-serif');
    expect(ui.getByText('Studio').className).not.toContain('font-studio-serif');
  });

  it('renders a chrome theme toggle that flips data-theme on the document element', () => {
    // Moved here from the Sidebar. The accessible name still matches /theme/i,
    // which is how the visual suite's setStudioTheme() locates it.
    document.documentElement.removeAttribute('data-theme');
    const { ui } = renderHeader();
    const toggle = ui.getByRole('button', { name: /theme/i });
    // Default-dark chrome: the hook applies dark on mount.
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    fireEvent.click(toggle);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    document.documentElement.removeAttribute('data-theme');
  });

  it('owns the mobile menu button and reports toggles to the parent', () => {
    // The button lives in the header (as the KB does) but the drawer state is
    // Layout's, so this only reports intent.
    const { ui, onNavOpenChange } = renderHeader(false);
    const menu = ui.getByRole('button', { name: /open navigation menu/i });
    expect(menu.getAttribute('aria-controls')).toBe('studio-sidebar');
    expect(menu.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(menu);
    expect(onNavOpenChange).toHaveBeenCalledWith(true);
  });

  it('reflects the open drawer in the menu button', () => {
    const { ui, onNavOpenChange } = renderHeader(true);
    const menu = ui.getByRole('button', { name: /close navigation menu/i });
    expect(menu.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(menu);
    expect(onNavOpenChange).toHaveBeenCalledWith(false);
  });
});
