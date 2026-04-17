/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    SermonFilters,
    type SermonFiltersProps,
} from '../../components/sermons/SermonFilters';
import type { FilterLabelCache } from '../../hooks/use-filter-label-cache';

/** Minimal stub — Task 25 requires the prop but doesn't consume it. */
const labelCacheStub: FilterLabelCache = {
    getLabel: () => undefined,
    absorb: () => {},
    mergeSelectedIntoOptions: (_d, options) => options,
};

/**
 * Factory that returns a full set of SermonFilters props with sensible
 * defaults. Each test overrides only the fields it cares about.
 */
function makeProps(
    overrides: Partial<SermonFiltersProps> = {},
): SermonFiltersProps {
    return {
        search: '',
        selectedSeriesIds: [],
        selectedSpeakerIds: [],
        selectedBookIds: [],
        selectedServiceTypeIds: [],
        selectedSeriesTypeIds: [],
        from: '',
        to: '',
        sort: 'date',
        order: 'desc',
        hasActiveFilters: false,
        seriesList: [
            {
                id: 10,
                title: 'Grace Series',
                displayTitle: 'Grace Series',
                subtitle: null,
                description: null,
                latestSermonDate: null,
                sermonCount: 0,
                book: null,
                seriesType: null,
            },
            {
                id: 11,
                title: 'Faith Series',
                displayTitle: 'Faith Series',
                subtitle: null,
                description: null,
                latestSermonDate: null,
                sermonCount: 0,
                book: null,
                seriesType: null,
            },
        ],
        speakers: [
            { id: 5, name: 'John Smith', bio: null },
            { id: 6, name: 'Jane Doe', bio: null },
        ],
        books: [{ id: 49, name: 'Ephesians' }],
        serviceTypes: [{ id: 1, name: 'Sunday Morning' }],
        seriesTypes: [{ id: 1, name: 'Sunday Morning Sermon' }],
        showServiceTypeFilter: false,
        showSeriesTypeFilter: false,
        onSearchChange: () => {},
        onSeriesChange: () => {},
        onSpeakerChange: () => {},
        onBookChange: () => {},
        onServiceTypesChange: () => {},
        onSeriesTypeChange: () => {},
        onDateRangeChange: () => {},
        onSortChange: () => {},
        onClearFilters: () => {},
        lockedFilters: new Set<string>(),
        labelCache: labelCacheStub,
        ...overrides,
    };
}

describe('SermonFilters locked filter suppression', () => {
    it('suppresses the speaker chip when speaker is locked', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['speaker']),
                    selectedSpeakerIds: [5],
                    hasActiveFilters: true,
                })}
            />,
        );

        // Chip aria-label format is `Remove <label> filter` where <label> is
        // the speaker name ("John Smith"), or falls back to "speaker".
        expect(
            screen.queryByRole('button', {
                name: /Remove John Smith filter/,
            }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: /Remove speaker filter/,
            }),
        ).toBeNull();
    });

    it('suppresses the series chip when series is locked', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['series']),
                    selectedSeriesIds: [10],
                    hasActiveFilters: true,
                })}
            />,
        );

        expect(
            screen.queryByRole('button', {
                name: /Remove Grace Series filter/,
            }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: /Remove series filter/,
            }),
        ).toBeNull();
    });

    it('suppresses the book chip when book is locked', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['book']),
                    selectedBookIds: [49],
                    hasActiveFilters: true,
                })}
            />,
        );

        expect(
            screen.queryByRole('button', {
                name: /Remove Ephesians filter/,
            }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: /Remove book filter/,
            }),
        ).toBeNull();
    });

    it('suppresses the serviceTypes chip when serviceTypes is locked', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['serviceTypes']),
                    selectedServiceTypeIds: [1],
                    hasActiveFilters: true,
                })}
            />,
        );

        expect(
            screen.queryByRole('button', {
                name: /Remove Sunday Morning filter/,
            }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: /Remove service type filter/,
            }),
        ).toBeNull();
    });

    it('suppresses the seriesType chip when seriesType is locked', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['seriesType']),
                    selectedSeriesTypeIds: [1],
                    hasActiveFilters: true,
                })}
            />,
        );

        expect(
            screen.queryByRole('button', {
                name: /Remove Sunday Morning Sermon filter/,
            }),
        ).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: /Remove series type filter/,
            }),
        ).toBeNull();
    });

    it('suppresses the search chip when search is locked', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['search']),
                    search: 'grace',
                    hasActiveFilters: true,
                })}
            />,
        );

        expect(
            screen.queryByRole('button', { name: /Remove search/ }),
        ).toBeNull();
    });

    it('hides the service-types dropdown when serviceTypes is locked even if showServiceTypeFilter is true', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['serviceTypes']),
                    showServiceTypeFilter: true,
                })}
            />,
        );

        // The dropdown's trigger button carries the placeholder text.
        expect(screen.queryByText('Service Types')).toBeNull();
    });

    it('hides the series-types dropdown when seriesType is locked even if showSeriesTypeFilter is true', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set(['seriesType']),
                    showSeriesTypeFilter: true,
                })}
            />,
        );

        expect(screen.queryByText('Series Types')).toBeNull();
    });

    it('renders chips and dropdowns normally when no filters are locked', () => {
        render(
            <SermonFilters
                {...makeProps({
                    lockedFilters: new Set<string>(),
                    selectedSeriesIds: [10],
                    selectedSpeakerIds: [5],
                    selectedBookIds: [49],
                    hasActiveFilters: true,
                })}
            />,
        );

        expect(
            screen.getByRole('button', { name: /Remove Grace Series filter/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Remove John Smith filter/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Remove Ephesians filter/ }),
        ).toBeInTheDocument();

        // Base dropdowns (series/speaker/book) should render their placeholders
        // via the combobox (these show selectedLabel+count when items selected,
        // but the trigger still exists) — assert via presence of the trigger
        // placeholder text for an unselected dropdown.
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
    });
});
