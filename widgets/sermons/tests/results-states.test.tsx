/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { SermonsView } from '../src/components/sermons/SermonsView';
import { SeriesView } from '../src/components/series/SeriesView';
import { SermonsConfigSchema, type SermonsConfig } from '../src/types';
import type { useSermonFilters } from '../src/hooks/use-sermon-filters';
import { ApiError } from '@perimeter/api-hooks';

/**
 * Error / empty / loading states (Task 10). jsdom can't simulate layout, so we
 * assert structure + handler wiring, not geometry. The views take `config` and
 * `filters` as plain props, so we drive them with a stub filters object and
 * mock the data hooks per-test — no nuqs router/ApiClient context needed.
 *
 * Each query hook is a `vi.fn()` so a test can override its return for that
 * render. `beforeEach` resets every hook to a benign empty-success envelope.
 */

type QueryShape = {
  data?: unknown;
  isLoading?: boolean;
  error?: unknown;
  refetch?: () => void;
};

function queryResult(over: QueryShape = {}) {
  return {
    data: over.data,
    isLoading: over.isLoading ?? false,
    isError: over.error != null,
    isSuccess: over.error == null && over.data != null,
    error: over.error ?? null,
    refetch: over.refetch ?? vi.fn(),
  };
}

const emptySermons = {
  success: true,
  data: { sermons: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
};
const emptySeries = {
  success: true,
  data: { series: [], pagination: { page: 1, perPage: 12, total: 0, totalPages: 0 } },
};

const useSermons = vi.fn(() => queryResult({ data: emptySermons }));
const useSeries = vi.fn(() => queryResult({ data: emptySeries }));

vi.mock('@perimeter/api-hooks', async () => {
  // Keep the real exports (notably the ApiError class, so `instanceof` in
  // ResultsError matches the errors these tests construct) and override only
  // the data hooks.
  const actual = await vi.importActual<Record<string, unknown>>('@perimeter/api-hooks');
  return {
    ...actual,
    useSermons: (...args: unknown[]) => useSermons(...(args as [])),
    useSeries: (...args: unknown[]) => useSeries(...(args as [])),
    useSermonDetail: () => queryResult({ data: { success: true, data: null } }),
    useSeriesDetail: () => queryResult({ data: { success: true, data: null } }),
    useSpeakers: () => queryResult({ data: { success: true, data: [] } }),
    useBooks: () => queryResult({ data: { success: true, data: [] } }),
    useServiceTypes: () => queryResult({ data: { success: true, data: [] } }),
    useSeriesTypes: () => queryResult({ data: { success: true, data: [] } }),
  };
});

function makeFilters(over: Partial<ReturnType<typeof useSermonFilters>> = {}) {
  return {
    search: '',
    selectedSeriesIds: [],
    selectedSpeakerIds: [],
    selectedBookIds: [],
    selectedServiceTypeIds: [],
    selectedSeriesTypeIds: [],
    from: null,
    to: null,
    sort: 'date',
    order: 'desc',
    page: 1,
    view: 'grid',
    screen: 'browse',
    detailId: null,
    hasActiveFilters: false,
    activeFilterCount: 0,
    lockedFilters: new Set<string>(),
    setSearch: vi.fn(),
    setView: vi.fn(),
    setSeriesIds: vi.fn(),
    setSpeakerIds: vi.fn(),
    setBookIds: vi.fn(),
    setServiceTypes: vi.fn(),
    setSeriesTypeIds: vi.fn(),
    setDateRange: vi.fn(),
    setSort: vi.fn(),
    setPage: vi.fn(),
    setScreen: vi.fn(),
    clearFilters: vi.fn(),
    ...over,
  } as unknown as ReturnType<typeof useSermonFilters>;
}

function config(over: Record<string, unknown> = {}): SermonsConfig {
  return SermonsConfigSchema.parse(over);
}

beforeEach(() => {
  useSermons.mockReturnValue(queryResult({ data: emptySermons }));
  useSeries.mockReturnValue(queryResult({ data: emptySeries }));
});

describe('SermonsView results states', () => {
  it('renders a distinct error block with a retry that refetches', () => {
    const refetch = vi.fn();
    useSermons.mockReturnValue(queryResult({ error: new Error('boom'), refetch }));
    const { container } = render(
      <SermonsView config={config()} filters={makeFilters()} breakpoint="desktop" />,
    );
    const errBlock = container.querySelector('[data-slot="results-error"]') as HTMLElement;
    expect(errBlock).toBeTruthy();
    // empty state must NOT also render — error is visually distinct
    expect(container.querySelector('[data-slot="results-empty"]')).toBeNull();
    fireEvent.click(within(errBlock).getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a session-expired error block on a 401 (not a generic outage)', () => {
    useSermons.mockReturnValue(
      queryResult({ error: new ApiError(401, 'unauthorized'), refetch: vi.fn() }),
    );
    const { container, getByText } = render(
      <SermonsView config={config()} filters={makeFilters()} breakpoint="desktop" />,
    );
    const errBlock = container.querySelector('[data-slot="results-error"]') as HTMLElement;
    expect(errBlock).toBeTruthy();
    expect(getByText('Session expired')).toBeInTheDocument();
  });

  it('shows the generic outage message on a non-401 error', () => {
    useSermons.mockReturnValue(queryResult({ error: new ApiError(500, 'boom'), refetch: vi.fn() }));
    const { getByText } = render(
      <SermonsView config={config()} filters={makeFilters()} breakpoint="desktop" />,
    );
    expect(getByText(/Couldn.t load sermons/)).toBeInTheDocument();
  });

  it('renders a themed empty state without a clear-filters CTA when no filters active', () => {
    render(
      <SermonsView
        config={config()}
        filters={makeFilters({ hasActiveFilters: false })}
        breakpoint="desktop"
      />,
    );
    const empty = document.querySelector('[data-slot="results-empty"]') as HTMLElement;
    expect(empty).toBeTruthy();
    expect(within(empty).queryByRole('button', { name: /clear filters/i })).toBeNull();
  });

  it('shows a clear-filters CTA that calls clearFilters when filters are active', () => {
    const clearFilters = vi.fn();
    render(
      <SermonsView
        config={config()}
        filters={makeFilters({ hasActiveFilters: true, clearFilters })}
        breakpoint="desktop"
      />,
    );
    const empty = document.querySelector('[data-slot="results-empty"]') as HTMLElement;
    fireEvent.click(within(empty).getByRole('button', { name: /clear filters/i }));
    expect(clearFilters).toHaveBeenCalledTimes(1);
  });

  it('reserves the result-count line while loading so the toolbar does not reflow', () => {
    useSermons.mockReturnValue(queryResult({ isLoading: true }));
    const { container } = render(
      <SermonsView config={config()} filters={makeFilters()} breakpoint="desktop" />,
    );
    const countLine = container.querySelector('[data-slot="results-count"]') as HTMLElement;
    expect(countLine).toBeTruthy();
    // Always occupies a line: rendered even with no pagination yet.
    expect(countLine).toBeInTheDocument();
  });

  // The loading skeleton must mirror the LOADED layout per viewMode so the
  // results region doesn't jump shape when data arrives. The skeleton wrapper
  // carries the same container class the corresponding view component uses
  // (grid → .grid with @[…] cols, list → stacked rows, large → space-y-4),
  // and renders `perPage` placeholder items.
  it('grid loading skeleton mirrors the grid layout with perPage items', () => {
    useSermons.mockReturnValue(queryResult({ isLoading: true }));
    const { container } = render(
      <SermonsView
        config={config({ perPage: 6 })}
        filters={makeFilters({ view: 'grid' })}
        breakpoint="desktop"
      />,
    );
    const sk = container.querySelector('[data-slot="sermon-skeleton"]') as HTMLElement;
    expect(sk).toBeTruthy();
    expect(sk).toHaveClass('grid', '@[30rem]:grid-cols-2', '@[48rem]:grid-cols-3');
    expect(sk.querySelectorAll('[data-slot="sermon-skeleton-item"]')).toHaveLength(6);
  });

  it('list loading skeleton uses a stacked (non-grid) layout', () => {
    useSermons.mockReturnValue(queryResult({ isLoading: true }));
    const { container } = render(
      <SermonsView
        config={config({ perPage: 4 })}
        filters={makeFilters({ view: 'list' })}
        breakpoint="desktop"
      />,
    );
    const sk = container.querySelector('[data-slot="sermon-skeleton"]') as HTMLElement;
    expect(sk).toBeTruthy();
    expect(sk).not.toHaveClass('grid');
    expect(sk.querySelectorAll('[data-slot="sermon-skeleton-item"]')).toHaveLength(4);
  });

  it('large loading skeleton uses the vertical-stack layout', () => {
    useSermons.mockReturnValue(queryResult({ isLoading: true }));
    const { container } = render(
      <SermonsView
        config={config({ perPage: 3 })}
        filters={makeFilters({ view: 'large' })}
        breakpoint="desktop"
      />,
    );
    const sk = container.querySelector('[data-slot="sermon-skeleton"]') as HTMLElement;
    expect(sk).toBeTruthy();
    expect(sk).not.toHaveClass('grid');
    expect(sk).toHaveClass('space-y-4');
    expect(sk.querySelectorAll('[data-slot="sermon-skeleton-item"]')).toHaveLength(3);
  });
});

describe('SeriesView results states', () => {
  it('renders a distinct error block with a retry that refetches', () => {
    const refetch = vi.fn();
    useSeries.mockReturnValue(queryResult({ error: new Error('boom'), refetch }));
    const { container } = render(
      <SeriesView config={config()} filters={makeFilters()} breakpoint="desktop" />,
    );
    const errBlock = container.querySelector('[data-slot="results-error"]') as HTMLElement;
    expect(errBlock).toBeTruthy();
    expect(container.querySelector('[data-slot="results-empty"]')).toBeNull();
    fireEvent.click(within(errBlock).getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a clear-filters CTA that calls clearFilters when filters are active', () => {
    const clearFilters = vi.fn();
    render(
      <SeriesView
        config={config()}
        filters={makeFilters({ hasActiveFilters: true, clearFilters })}
        breakpoint="desktop"
      />,
    );
    const empty = document.querySelector('[data-slot="results-empty"]') as HTMLElement;
    fireEvent.click(within(empty).getByRole('button', { name: /clear filters/i }));
    expect(clearFilters).toHaveBeenCalledTimes(1);
  });

  it('list loading skeleton mirrors the list layout (non-grid, perPage items)', () => {
    useSeries.mockReturnValue(queryResult({ isLoading: true }));
    const { container } = render(
      <SeriesView
        config={config({ perPage: 5 })}
        filters={makeFilters({ view: 'list' })}
        breakpoint="desktop"
      />,
    );
    const sk = container.querySelector('[data-slot="sermon-skeleton"]') as HTMLElement;
    expect(sk).toBeTruthy();
    expect(sk).not.toHaveClass('grid');
    expect(sk.querySelectorAll('[data-slot="sermon-skeleton-item"]')).toHaveLength(5);
  });
});
