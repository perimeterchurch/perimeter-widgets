// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, within, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { OverviewPage } from './OverviewPage';

// Render-path guard for the overview directory. Discovery globs resolve against repo
// root in tests the same way they do in the dev server, so this asserts against the
// REAL seed widgets/components. No global RTL auto-cleanup — unmount between tests.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubManifest(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }),
  );
}

describe('OverviewPage', () => {
  // Loading the real sermons widget module through the vite transform can take
  // several seconds under full-suite load (same deflake budget as the catalog
  // page tests) — give the wait and the test real headroom.
  it(
    'links released widgets to their canonical catalog page, unreleased to the dev page',
    { timeout: 20_000 },
    async () => {
      stubManifest({ sermons: '1.4.2' });
      const { container } = render(
        <MemoryRouter>
          <OverviewPage />
        </MemoryRouter>,
      );
      const ui = within(container);

      // Released (in the manifest) → catalog viewer is the canonical page.
      // Re-query inside waitFor: the link's `to` doubles as its list key, so the
      // node is REPLACED (not mutated) when the catalog resolves — a held
      // reference would stay detached with the old href forever.
      await waitFor(
        () =>
          expect(ui.getByRole('link', { name: /sermons/i }).getAttribute('href')).toBe(
            '/catalog/sermons',
          ),
        { timeout: 10_000 },
      );
      const sermons = ui.getByRole('link', { name: /sermons/i });
      // Title Case label derived from the slug, raw slug retained as code reference.
      expect(within(sermons).getByText('Sermons')).toBeTruthy();
      expect(within(sermons).getByText('sermons')).toBeTruthy();

      // Not in the manifest → still the source-preview page.
      const example = ui.getByRole('link', { name: /example/i });
      expect(example.getAttribute('href')).toBe('/widgets/example');
    },
  );
});
