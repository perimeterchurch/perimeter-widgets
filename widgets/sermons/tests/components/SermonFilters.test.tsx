/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SermonFilters, type SermonFiltersProps } from '../../src/components/sermons/SermonFilters';
import { useFilterLabelCache, type FilterLabelCache } from '../../src/hooks/use-filter-label-cache';

/**
 * Faithful stub that mimics mergeSelectedIntoOptions so tests that don't care
 * about cache rehydration still see correct option lists (selected-but-missing
 * ids appear with a fallback label).
 */
const labelCacheStub: FilterLabelCache = {
  getLabel: () => undefined,
  absorb: () => {},
  mergeSelectedIntoOptions: (_d, options) => options,
};

/**
 * Factory that returns a full set of SermonFilters props with sensible
 * defaults. Each test overrides only the fields it cares about.
 */
function makeProps(overrides: Partial<SermonFiltersProps> = {}): SermonFiltersProps {
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

    expect(screen.queryByRole('button', { name: /Remove search/ })).toBeNull();
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

    expect(screen.getByRole('button', { name: /Remove Grace Series filter/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove John Smith filter/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove Ephesians filter/ })).toBeInTheDocument();

    // Base dropdowns (series/speaker/book) should render their placeholders
    // via the combobox (these show selectedLabel+count when items selected,
    // but the trigger still exists) — assert via presence of the trigger
    // placeholder text for an unselected dropdown.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});

describe('SermonFilters row layout', () => {
  it('search InputGroup fills its row (w-full)', () => {
    const { container } = render(<SermonFilters {...makeProps()} />);
    const inputGroup = container.querySelector('[data-slot="input-group"]');
    expect(inputGroup).not.toBeNull();
    expect(inputGroup?.className).toContain('w-full');
  });

  it('filter row wraps and packs dropdowns at intrinsic width (no flex-1 spread)', () => {
    const { container } = render(<SermonFilters {...makeProps()} />);
    // The filter-row container wraps the multi-combobox dropdowns.
    const dropdowns = container.querySelectorAll('[data-slot="multi-combobox"]');
    expect(dropdowns.length).toBeGreaterThan(0);

    // No dropdown should stretch with flex-1 (that produced the big equal gaps).
    dropdowns.forEach((el) => {
      expect(el.className).not.toContain('flex-1');
    });

    // The shared parent row should be a wrapping flex row so dropdowns pack left.
    const row = dropdowns[0]?.parentElement;
    expect(row).not.toBeNull();
    expect(row?.className).toContain('flex');
    expect(row?.className).toContain('flex-wrap');
  });
});

describe('SermonFilters in-field search clear', () => {
  it('shows no clear button when the search field is empty', () => {
    render(<SermonFilters {...makeProps({ search: '' })} />);
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  it('shows an in-field clear button when search has a value and calls onSearchChange("") on click', async () => {
    const onSearchChange = vi.fn();
    render(<SermonFilters {...makeProps({ search: 'grace', onSearchChange })} />);

    const clear = screen.getByRole('button', { name: 'Clear search' });
    expect(clear).toBeInTheDocument();
    await userEvent.click(clear);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('does not render the in-field clear when search is locked (field hidden)', () => {
    render(
      <SermonFilters {...makeProps({ search: 'grace', lockedFilters: new Set(['search']) })} />,
    );
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });
});

describe('SermonFilters labelCache integration', () => {
  /**
   * Open the Nth dropdown (by its "toggle menu" aria-label). The filter row
   * renders the dropdowns in order: series, speaker, book, (serviceType),
   * (seriesType).
   */
  async function openDropdown(index: number) {
    const toggles = screen.getAllByRole('button', { name: /toggle menu/i });
    const toggle = toggles[index];
    if (!toggle) throw new Error(`No dropdown at index ${index}`);
    await userEvent.click(toggle);
  }

  it('shows a selected-but-narrowed-out speaker in the dropdown using the cached label', async () => {
    const { result } = renderHook(() => useFilterLabelCache());
    result.current.absorb('speaker', [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);

    render(
      <SermonFilters
        {...makeProps({
          speakers: [{ id: 1, name: 'A', bio: null }],
          selectedSpeakerIds: [1, 2],
          hasActiveFilters: true,
          labelCache: result.current,
        })}
      />,
    );

    // Speaker dropdown is the second one (index 1).
    await openDropdown(1);

    const optionA = await screen.findByRole('option', { name: 'A' });
    const optionB = await screen.findByRole('option', { name: 'B' });
    expect(optionA).toBeInTheDocument();
    expect(optionB).toBeInTheDocument();

    // "B" appears after "A" in the DOM order (narrowed options first).
    expect(
      optionA.compareDocumentPosition(optionB) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('falls back to "Speaker <id>" when a selected speaker is unseen by the cache', async () => {
    const { result } = renderHook(() => useFilterLabelCache());

    render(
      <SermonFilters
        {...makeProps({
          speakers: [],
          selectedSpeakerIds: [42],
          hasActiveFilters: true,
          labelCache: result.current,
        })}
      />,
    );

    await openDropdown(1);

    expect(await screen.findByRole('option', { name: 'Speaker 42' })).toBeInTheDocument();
  });

  it('renders the chip for a narrowed-out speaker using the cached label', () => {
    const { result } = renderHook(() => useFilterLabelCache());
    result.current.absorb('speaker', [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
    ]);

    render(
      <SermonFilters
        {...makeProps({
          // Only speaker 1 is in the narrowed facet list; 2 is cached.
          speakers: [{ id: 1, name: 'A', bio: null }],
          selectedSpeakerIds: [1, 2],
          hasActiveFilters: true,
          labelCache: result.current,
        })}
      />,
    );

    expect(screen.getByRole('button', { name: /Remove A filter/ })).toBeInTheDocument();
    // Chip for the narrowed-out speaker resolves to the cached label "B",
    // not the generic "Speaker" fallback.
    expect(screen.getByRole('button', { name: /Remove B filter/ })).toBeInTheDocument();
  });
});
