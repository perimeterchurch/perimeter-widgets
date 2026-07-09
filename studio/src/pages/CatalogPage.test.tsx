// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, within, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CatalogPage } from './CatalogPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubManifest(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }));
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>,
  );
}

describe('CatalogPage', () => {
  it('shows skeleton cards while loading, then real cards', async () => {
    stubManifest({ 'my-shepherds': '0.1.0', sermons: '1.4.2' });
    const { container } = renderPage();
    expect(container.querySelector('[data-testid="catalog-skeleton"]')).toBeTruthy();
    const ui = within(container);
    // First real widget-module import goes through vitest's transform pipeline;
    // under a fully parallel workspace run that can exceed the 1s default.
    const link = await ui.findByRole('link', { name: /my shepherds/i }, { timeout: 10_000 });
    expect(link.getAttribute('href')).toBe('/catalog/my-shepherds');
    expect(within(link).getByText('0.1.0')).toBeTruthy();
    // auth: 'required' → badge
    expect(within(link).getByText(/sign-in required/i)).toBeTruthy();
  });

  it('renders an error banner with retry on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { container } = renderPage();
    const ui = within(container);
    const retry = await ui.findByRole('button', { name: /retry/i });
    stubManifest({ sermons: '1.4.2' });
    fireEvent.click(retry);
    await waitFor(() => expect(ui.getByRole('link', { name: /sermons/i })).toBeTruthy(), {
      timeout: 10_000,
    });
  });
});
