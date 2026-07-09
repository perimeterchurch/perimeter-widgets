// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// The page renders CdnBundlePreview, whose srcdoc carries scripts happy-dom
// would otherwise execute/fetch (see CdnBundlePreview.test.tsx). The stubbed
// fetch here has no text()/body surface, so script loading through it would
// throw; assertions never need the srcdoc to run.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { CatalogWidgetPage } from './CatalogWidgetPage';

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

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/catalog/${slug}`]}>
      <Routes>
        <Route path="/catalog/:slug" element={<CatalogWidgetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CatalogWidgetPage', () => {
  it('shows skeletons while loading, then the live embed + snippet + docs link', async () => {
    stubManifest({ sermons: '1.4.2' });
    const { container } = renderAt('sermons');
    expect(container.querySelector('[data-testid="viewer-skeleton"]')).toBeTruthy();
    const ui = within(container);
    await ui.findByTitle('Live widget: sermons');
    // Snippet reflects the (empty) override set.
    expect(container.textContent).toContain('data-perimeter-widget="sermons"');
    expect(container.textContent).toContain('loader.js');
    const docsLink = ui.getByRole('link', { name: /widget docs/i });
    expect(docsLink.getAttribute('href')).toBe('/widgets/sermons');
  });

  it('renders NotFound for a slug that is not in the manifest', async () => {
    stubManifest({ sermons: '1.4.2' });
    const { container } = renderAt('event-finder');
    await within(container).findByText(/not found/i);
  });

  it('renders a reduced viewer (no playground) for a stale manifest entry', async () => {
    stubManifest({ ghost: '9.9.9' });
    const { container } = renderAt('ghost');
    const ui = within(container);
    await ui.findByTitle('Live widget: ghost');
    expect(container.querySelector('[data-testid="config-playground"]')).toBeNull();
  });
});
