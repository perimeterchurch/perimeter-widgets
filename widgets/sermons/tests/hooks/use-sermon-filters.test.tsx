import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { OnUrlUpdateFunction, UrlUpdateEvent } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import { useSermonFilters } from '../../src/hooks/use-sermon-filters';
import type { SermonsConfig } from '../../src/types';
import type { ContainerBreakpoint } from '../../src/lib/breakpoint';

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

  describe('view-mode persistence', () => {
    it('defaults the view to config.defaultView', () => {
      const { result } = renderFilters({ defaultView: 'large' });
      expect(result.current.view).toBe('large');
    });

    it('reads the view from the URL when present', () => {
      const { result } = renderHook(() => useSermonFilters(baseConfig), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NuqsTestingAdapter searchParams="?view=list">{children}</NuqsTestingAdapter>
        ),
      });
      expect(result.current.view).toBe('list');
    });

    it('setView updates the persisted view', () => {
      const { result } = renderFilters();
      act(() => result.current.setView('list'));
      expect(result.current.view).toBe('list');
    });

    it('clearFilters does not reset the view (it is a layout preference, not a filter)', () => {
      const { result } = renderFilters();
      act(() => result.current.setView('large'));
      act(() => result.current.clearFilters());
      expect(result.current.view).toBe('large');
    });
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

  describe('search debounce', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    // Drain both nuqs timers: the per-key debounce window AND the global
    // throttle queue's own follow-up flush (which schedules its own timer and
    // resolves through a promise chain — hence the async timer advance).
    async function flushUrlWrites() {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400);
      });
    }

    function renderWithSpy(onUrlUpdate: OnUrlUpdateFunction) {
      return renderHook(() => useSermonFilters(baseConfig), {
        wrapper: ({ children }: { children: ReactNode }) => (
          // `hasMemory` makes the adapter mutate its in-memory searchParams on
          // each flush so successive writes (e.g. set then clear) see prior
          // state; `rateLimitFactor: 1` keeps the debounce window honest.
          <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} rateLimitFactor={1} hasMemory>
            {children}
          </NuqsTestingAdapter>
        ),
      });
    }

    it('keeps the search value responsive immediately (no debounce on the returned value)', () => {
      vi.useFakeTimers();
      const onUrlUpdate = vi.fn();
      const { result } = renderWithSpy(onUrlUpdate);
      act(() => result.current.setSearch('grace'));
      // The optimistic state reflects the typed value right away, even though
      // the URL write is still pending behind the debounce timer.
      expect(result.current.search).toBe('grace');
    });

    it('coalesces rapid keystrokes into a single URL update after the debounce window', async () => {
      vi.useFakeTimers();
      const events: UrlUpdateEvent[] = [];
      const { result } = renderWithSpy((e) => events.push(e));

      act(() => {
        result.current.setSearch('g');
        result.current.setSearch('gr');
        result.current.setSearch('gra');
        result.current.setSearch('grace');
      });
      // Nothing flushed before the debounce window elapses.
      expect(events).toHaveLength(0);

      await flushUrlWrites();

      expect(events).toHaveLength(1);
      expect(events[0]!.searchParams.get('search')).toBe('grace');
      // History must be replace (not push) so typing doesn't spam the back stack.
      expect(events[0]!.options.history).toBe('replace');
    });

    it('the in-field clear resets search to empty via the same debounced setter', async () => {
      vi.useFakeTimers();
      const events: UrlUpdateEvent[] = [];
      const { result } = renderWithSpy((e) => events.push(e));

      act(() => result.current.setSearch('grace'));
      await flushUrlWrites();
      events.length = 0;

      act(() => result.current.setSearch(''));
      expect(result.current.search).toBe('');
      await flushUrlWrites();
      expect(events).toHaveLength(1);
      // Cleared to default ('') → param dropped from the URL.
      expect(events[0]!.searchParams.get('search')).toBeNull();
    });
  });

  describe('responsive default view + activeFilterCount', () => {
    function renderResponsive(
      config: Partial<SermonsConfig>,
      opts: { breakpoint?: ContainerBreakpoint; searchParams?: string } = {},
    ) {
      const fullConfig: SermonsConfig = {
        perPage: 12,
        defaultTab: 'sermons',
        defaultView: 'grid',
        display: 'full',
        ...config,
      };
      return renderHook(() => useSermonFilters(fullConfig, { breakpoint: opts.breakpoint }), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NuqsTestingAdapter searchParams={opts.searchParams ?? ''}>{children}</NuqsTestingAdapter>
        ),
      });
    }

    it('defaults view to list on phone when unset', () => {
      expect(renderResponsive({}, { breakpoint: 'phone' }).result.current.view).toBe('list');
    });
    it('defaults view to the config default on tablet/desktop when unset', () => {
      expect(renderResponsive({}, { breakpoint: 'tablet' }).result.current.view).toBe('grid');
      expect(
        renderResponsive({ defaultView: 'large' }, { breakpoint: 'desktop' }).result.current.view,
      ).toBe('large');
    });
    it('preserves an explicit ?view= even on phone', () => {
      expect(
        renderResponsive({}, { breakpoint: 'phone', searchParams: '?view=grid' }).result.current
          .view,
      ).toBe('grid');
    });
    it('activeFilterCount counts collapsible dims (date range once), excludes search + locked', () => {
      const r = renderResponsive(
        {},
        {
          searchParams: '?series=1,2&from=2026-01-01&to=2026-02-01&search=x',
        },
      ).result.current;
      expect(r.activeFilterCount).toBe(2); // series + date-range; search excluded
      expect(r.hasActiveFilters).toBe(true);
    });
    it('activeFilterCount is 0 for a search-only state, but hasActiveFilters is true', () => {
      const r = renderResponsive({}, { searchParams: '?search=x' }).result.current;
      expect(r.activeFilterCount).toBe(0);
      expect(r.hasActiveFilters).toBe(true);
    });
  });
});
