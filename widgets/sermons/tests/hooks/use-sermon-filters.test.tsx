import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { useSermonFilters } from '../../src/hooks/use-sermon-filters';
import type { SermonsConfig } from '../../src/types';

function renderFilters(config: Partial<SermonsConfig> = {}) {
  const fullConfig: SermonsConfig = {
    perPage: 12,
    defaultTab: 'sermons',
    defaultView: 'grid',
    display: 'full',
    ...config,
  };
  return renderHook(() => useSermonFilters(fullConfig), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <NuqsTestingAdapter>{children}</NuqsTestingAdapter>
    ),
  });
}

describe('useSermonFilters', () => {
  it('returns default values without config locks', () => {
    const { result } = renderFilters();
    expect(result.current.tab).toBe('sermons');
    expect(result.current.sort).toBe('date');
  });

  it('returns locked tab from config', () => {
    const { result } = renderFilters({ tab: 'series' });
    expect(result.current.tab).toBe('series');
  });

  it('setTab is a no-op when tab is locked', () => {
    const { result } = renderFilters({ tab: 'sermons' });
    act(() => result.current.setTab('series'));
    expect(result.current.tab).toBe('sermons');
  });

  it('returns locked seriesId from config as selectedSeriesIds', () => {
    const { result } = renderFilters({ seriesId: '945' });
    expect(result.current.selectedSeriesIds).toEqual([945]);
  });

  it('setSeriesIds is a no-op when seriesId is locked', () => {
    const { result } = renderFilters({ seriesId: '945' });
    act(() => result.current.setSeriesIds([100]));
    expect(result.current.selectedSeriesIds).toEqual([945]);
  });

  it('returns locked from/to from config', () => {
    const { result } = renderFilters({
      from: '2025-01-01',
      to: '2025-12-31',
    });
    expect(result.current.from).toBe('2025-01-01');
    expect(result.current.to).toBe('2025-12-31');
  });

  it('hasActiveFilters excludes locked filters', () => {
    const { result } = renderFilters({ seriesId: '945' });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('clearFilters does not clear locked values', () => {
    const { result } = renderFilters({ seriesId: '945' });
    act(() => result.current.setSpeakerIds([7]));
    expect(result.current.hasActiveFilters).toBe(true);
    act(() => result.current.clearFilters());
    expect(result.current.selectedSeriesIds).toEqual([945]);
    expect(result.current.selectedSpeakerIds).toEqual([]);
  });

  it('uses defaultTab for initial tab value', () => {
    const { result } = renderFilters({ defaultTab: 'series' });
    expect(result.current.tab).toBe('series');
  });

  it('supports multi-select series IDs from config', () => {
    const { result } = renderFilters({ seriesId: '1,2,3' });
    expect(result.current.selectedSeriesIds).toEqual([1, 2, 3]);
  });

  const baseConfig: SermonsConfig = {
    perPage: 12,
    defaultTab: 'sermons',
    defaultView: 'grid',
    display: 'full',
  };

  function renderWithParams(searchParams: string, options?: { prefix?: string }) {
    return renderHook(() => useSermonFilters(baseConfig, options ?? {}), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NuqsTestingAdapter searchParams={searchParams}>{children}</NuqsTestingAdapter>
      ),
    });
  }

  it('reads the prefixed URL key when a prefix is set (multi-embed namespacing)', () => {
    // With prefix 'sx.', the hook reads from `sx.tab`, not bare `tab`.
    const { result } = renderWithParams('?sx.tab=series', { prefix: 'sx.' });
    expect(result.current.tab).toBe('series');
  });

  it('ignores a bare key when a prefix is set (embeds do not collide)', () => {
    // A bare `?tab=series` must NOT leak into a prefixed embed — it stays default.
    const { result } = renderWithParams('?tab=series', { prefix: 'sx.' });
    expect(result.current.tab).toBe('sermons');
  });

  it('reads the bare URL key with no prefix (identity)', () => {
    const { result } = renderWithParams('?tab=series');
    expect(result.current.tab).toBe('series');
  });
});
