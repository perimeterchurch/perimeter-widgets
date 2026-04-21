import { useRef, useCallback, useMemo } from 'react';

export type Dimension =
    | 'speaker'
    | 'book'
    | 'series'
    | 'serviceType'
    | 'seriesType';

const DIMENSION_SINGULAR: Record<Dimension, string> = {
    speaker: 'Speaker',
    book: 'Book',
    series: 'Series',
    serviceType: 'Service Type',
    seriesType: 'Series Type',
};

export interface FilterLabelCache {
    /** Look up a cached label for a dimension's ID. Returns undefined if unseen. */
    getLabel(dimension: Dimension, id: number): string | undefined;
    /** Update the cache with fresh facets responses. */
    absorb(
        dimension: Dimension,
        options: { id: number; label: string }[],
    ): void;
    /**
     * Produce the final option list for a dropdown:
     * narrowed options first (original order), followed by any
     * selected-but-missing options rehydrated from the cache.
     */
    mergeSelectedIntoOptions(
        dimension: Dimension,
        narrowedOptions: { value: string; label: string }[],
        selectedIds: number[],
    ): { value: string; label: string }[];
}

export function useFilterLabelCache(): FilterLabelCache {
    const cacheRef = useRef<Map<Dimension, Map<number, string>>>(new Map());

    const getLabel = useCallback((dimension: Dimension, id: number) => {
        return cacheRef.current.get(dimension)?.get(id);
    }, []);

    const absorb = useCallback(
        (dimension: Dimension, options: { id: number; label: string }[]) => {
            let dimMap = cacheRef.current.get(dimension);
            if (!dimMap) {
                dimMap = new Map();
                cacheRef.current.set(dimension, dimMap);
            }
            for (const opt of options) dimMap.set(opt.id, opt.label);
        },
        [],
    );

    const mergeSelectedIntoOptions = useCallback(
        (
            dimension: Dimension,
            narrowedOptions: { value: string; label: string }[],
            selectedIds: number[],
        ) => {
            const presentValues = new Set(narrowedOptions.map((o) => o.value));
            const missing = selectedIds
                .filter((id) => !presentValues.has(String(id)))
                .map((id) => ({
                    value: String(id),
                    label:
                        cacheRef.current.get(dimension)?.get(id)
                        ?? `${DIMENSION_SINGULAR[dimension]} ${id}`,
                }));
            return [...narrowedOptions, ...missing];
        },
        [],
    );

    // Memoize return value so consumers listing labelCache in useEffect deps
    // don't re-run every parent render.
    return useMemo(
        () => ({ getLabel, absorb, mergeSelectedIntoOptions }),
        [getLabel, absorb, mergeSelectedIntoOptions],
    );
}
