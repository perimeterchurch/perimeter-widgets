import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { useSermonFilters } from '../hooks/use-sermon-filters';
import type { SermonsConfig } from '../types';

function renderFilters(config: Partial<SermonsConfig> = {}) {
    const fullConfig: SermonsConfig = {
        perPage: 12,
        defaultTab: 'sermons',
        defaultView: 'grid',
        display: 'full',
        ...config,
    };
    return renderHook(() => useSermonFilters(fullConfig), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
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

    it('returns locked seriesId from config', () => {
        const { result } = renderFilters({ seriesId: 945 });
        expect(result.current.series).toBe(945);
    });

    it('setSeries is a no-op when seriesId is locked', () => {
        const { result } = renderFilters({ seriesId: 945 });
        act(() => result.current.setSeries(100));
        expect(result.current.series).toBe(945);
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
        const { result } = renderFilters({ seriesId: 945 });
        expect(result.current.hasActiveFilters).toBe(false);
    });

    it('clearFilters does not clear locked values', () => {
        const { result } = renderFilters({ seriesId: 945 });
        act(() => result.current.setSpeaker(7));
        expect(result.current.hasActiveFilters).toBe(true);
        act(() => result.current.clearFilters());
        expect(result.current.series).toBe(945);
        expect(result.current.speaker).toBeNull();
    });

    it('uses defaultTab for initial tab value', () => {
        const { result } = renderFilters({ defaultTab: 'series' });
        expect(result.current.tab).toBe('series');
    });
});
