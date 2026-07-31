// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { GuidePage } from './GuidePage';

// Render-path regression guard for the guide route. typecheck/build pass even when
// the page crashes at runtime, so exercise the actual render through the router (so
// useParams resolves :slug). Asserts against the REAL seed guide under
// docs/guides-mdx/*.mdx (the glob resolves against repo root in tests the same way
// it does in the dev server) — one consistent strategy, no mocking.

describe('GuidePage (/guides/:slug)', () => {
  // This suite has no global RTL auto-cleanup; unmount our render so the lazily
  // loaded MDX chunk does not leak into later tests.
  afterEach(cleanup);

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/guides/:slug" element={<GuidePage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the seed styling guide inside the MDX provider', async () => {
    const { container } = renderAt('/guides/styling-widgets');
    const scope = within(container);

    // Text unique to docs/guides-mdx/styling-widgets.mdx — proves the real MDX
    // chunk lazy-loaded and rendered through StudioMDXProvider.
    //
    // Generous timeout because this awaits a real lazy import, not a state
    // flush: transforming + evaluating the MDX chunk takes well over waitFor's
    // 1s default on a 2-core CI runner sharing cores with the other suites.
    // Matches the 10s the other lazy-chunk page tests use.
    await waitFor(
      () => {
        expect(scope.getByText(/tokens-first/i)).toBeTruthy();
      },
      { timeout: 10_000 },
    );
    // The guide owns the page heading: the MDX `# Styling widgets` maps to the
    // single studio-styled h1.
    expect(container.querySelector('h1')?.textContent).toBe('Styling widgets');

    // A breadcrumb trail sits above the guide: Home link + the guide title as the
    // current page.
    const crumbs = scope.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(crumbs).getByRole('link', { name: 'Home' })).toBeTruthy();
    expect(within(crumbs).getByText('Styling Widgets').getAttribute('aria-current')).toBe('page');
  });

  it('renders the 404 page for an unknown guide slug', () => {
    const { container } = renderAt('/guides/does-not-exist');
    expect(within(container).getByText('Page not found')).toBeTruthy();
  });
});
