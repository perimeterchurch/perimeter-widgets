/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/App';
import { SermonsConfigSchema, type SermonsConfig } from '../src/types';

/** Minimal UseQueryResult-shaped object wrapping the API envelope. */
function queryResult(envelope: unknown) {
  return {
    data: envelope,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
  };
}

// The views (SermonsView / SeriesView) pull live data through @perimeter/api-hooks,
// which needs an ApiClient context the test doesn't provide. Mock the hooks with
// stable empty envelopes so the tree renders deterministically; this suite only
// asserts on the tab strip, which renders independent of the fetched data.
vi.mock('@perimeter/api-hooks', () => ({
  useSermons: () =>
    queryResult({
      success: true,
      data: { sermons: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
    }),
  useSeries: () =>
    queryResult({
      success: true,
      data: { series: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
    }),
  useSermonDetail: () => queryResult({ success: true, data: null }),
  useSeriesDetail: () => queryResult({ success: true, data: null }),
  useSpeakers: () => queryResult({ success: true, data: [] }),
  useBooks: () => queryResult({ success: true, data: [] }),
  useServiceTypes: () => queryResult({ success: true, data: [] }),
  useSeriesTypes: () => queryResult({ success: true, data: [] }),
}));

function renderApp(overrides: Record<string, unknown> = {}) {
  const config: SermonsConfig = SermonsConfigSchema.parse(overrides);
  return render(<App config={config} />);
}

describe('App', () => {
  it('renders the Sermons tab', () => {
    renderApp();
    expect(screen.getByText('Sermons')).toBeInTheDocument();
  });

  it('renders the Series tab', () => {
    renderApp();
    expect(screen.getByText('Series')).toBeInTheDocument();
  });

  it('hides tabs when config.tab pins a single view', () => {
    // Embedder pinned to sermons — the tab strip should not render
    // because there's nothing the user can switch to.
    renderApp({ tab: 'sermons' });
    expect(screen.queryByRole('tab', { name: /sermons/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /series/i })).toBeNull();
  });

  it('hides tabs in headless display mode', () => {
    renderApp({ display: 'headless' });
    expect(screen.queryByRole('tab', { name: /sermons/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /series/i })).toBeNull();
  });

  it('marks the configured defaultTab as active', () => {
    renderApp({ defaultTab: 'series' });
    const seriesTab = screen.getByRole('tab', { name: /series/i });
    const sermonsTab = screen.getByRole('tab', { name: /sermons/i });
    expect(seriesTab).toHaveAttribute('aria-selected', 'true');
    expect(sermonsTab).toHaveAttribute('aria-selected', 'false');
  });
});
