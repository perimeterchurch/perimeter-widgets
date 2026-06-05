import { useMemo, useState, type ReactNode } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@perimeter/ui/input-group';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { MultiCombobox } from '@perimeter/ui/multi-combobox';
import type { MultiComboboxOption } from '@perimeter/ui/multi-combobox';
import { X, Search } from 'lucide-react';
import { DateRangePicker } from '../ui/DateRangePicker';
import { groupBooksByTestament } from '../../lib/bible-books';
import type { FilterLabelCache } from '../../hooks/use-filter-label-cache';
import type {
  Speaker,
  Book,
  SeriesListItem,
  ServiceType,
  SeriesType,
  SortField,
  SortOrder,
} from '../../types';

function FilterChip({
  label,
  ariaLabel,
  onRemove,
  variant = 'default',
}: {
  label: ReactNode;
  ariaLabel: string;
  onRemove: () => void;
  variant?: 'default' | 'secondary';
}) {
  return (
    <button type="button" onClick={onRemove} className="inline-flex" aria-label={ariaLabel}>
      <Badge variant={variant}>
        {label} <X className="h-3 w-3" />
      </Badge>
    </button>
  );
}

export interface SermonFiltersProps {
  search: string;
  selectedSeriesIds: number[];
  selectedSpeakerIds: number[];
  selectedBookIds: number[];
  selectedServiceTypeIds: number[];
  selectedSeriesTypeIds: number[];
  from: string;
  to: string;
  sort: SortField;
  order: SortOrder;
  hasActiveFilters: boolean;
  seriesList: SeriesListItem[];
  speakers: Speaker[];
  books: Book[];
  serviceTypes: ServiceType[];
  seriesTypes: SeriesType[];
  showServiceTypeFilter: boolean;
  showSeriesTypeFilter: boolean;
  seriesLoading?: boolean | undefined;
  speakersLoading?: boolean | undefined;
  booksLoading?: boolean | undefined;
  serviceTypesLoading?: boolean | undefined;
  seriesTypesLoading?: boolean | undefined;
  onSearchChange: (value: string) => void;
  onSeriesChange: (ids: number[]) => void;
  onSpeakerChange: (ids: number[]) => void;
  onBookChange: (ids: number[]) => void;
  onServiceTypesChange: (ids: number[]) => void;
  onSeriesTypeChange: (ids: number[]) => void;
  onDateRangeChange: (from: string | null, to: string | null) => void;
  onSortChange: (sort: SortField, order: SortOrder) => void;
  onClearFilters: () => void;
  lockedFilters: Set<string>;
  /**
   * Label cache for rehydrating selected filter chips that aren't present in
   * the current narrowed facet lists.
   */
  labelCache: FilterLabelCache;
}

type OpenDropdown = 'series' | 'speaker' | 'book' | 'serviceType' | 'seriesType';

export function SermonFilters(props: SermonFiltersProps) {
  // Only one filter dropdown open at a time
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown | null>(null);
  const seriesOptionsRaw: MultiComboboxOption[] = props.seriesList.map((s) => ({
    value: String(s.id),
    label: s.displayTitle ?? s.title,
  }));
  const seriesOptions: MultiComboboxOption[] = props.labelCache.mergeSelectedIntoOptions(
    'series',
    seriesOptionsRaw,
    props.selectedSeriesIds,
  );

  const speakerOptionsRaw: MultiComboboxOption[] = props.speakers.map((s) => ({
    value: String(s.id),
    label: s.name,
  }));
  const speakerOptions: MultiComboboxOption[] = props.labelCache.mergeSelectedIntoOptions(
    'speaker',
    speakerOptionsRaw,
    props.selectedSpeakerIds,
  );

  // Bible books: sorted in canonical order with OT/NT group headers.
  // Selected books that narrowed out of props.books are appended after the
  // grouped section (ungrouped) via labelCache.mergeSelectedIntoOptions.
  const bookOptions: MultiComboboxOption[] = useMemo(() => {
    const groups = groupBooksByTestament(props.books);
    const grouped: MultiComboboxOption[] = groups.flatMap((group) => [
      {
        value: `__group_${group.label}`,
        label: group.label,
        disabled: true,
        isGroupHeader: true,
      },
      ...group.options,
    ]);
    return props.labelCache.mergeSelectedIntoOptions('book', grouped, props.selectedBookIds);
  }, [props.books, props.labelCache, props.selectedBookIds]);

  const serviceTypeOptionsRaw: MultiComboboxOption[] = props.serviceTypes.map((st) => ({
    value: String(st.id),
    label: st.name,
  }));
  const serviceTypeOptions: MultiComboboxOption[] = props.labelCache.mergeSelectedIntoOptions(
    'serviceType',
    serviceTypeOptionsRaw,
    props.selectedServiceTypeIds,
  );

  const seriesTypeOptionsRaw: MultiComboboxOption[] = props.seriesTypes.map((st) => ({
    value: String(st.id),
    label: st.name,
  }));
  const seriesTypeOptions: MultiComboboxOption[] = props.labelCache.mergeSelectedIntoOptions(
    'seriesType',
    seriesTypeOptionsRaw,
    props.selectedSeriesTypeIds,
  );

  return (
    <div className="space-y-3">
      {/* Row 1: Search */}
      {!props.lockedFilters.has('search') && (
        <InputGroup className="w-full">
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={props.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              props.onSearchChange(e.target.value)
            }
            placeholder="Search sermons..."
          />
          {props.search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="Clear search"
                onClick={() => props.onSearchChange('')}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      )}

      {/* Row 2: Filter dropdowns */}
      {(!props.lockedFilters.has('series') ||
        !props.lockedFilters.has('speaker') ||
        !props.lockedFilters.has('book') ||
        (props.showServiceTypeFilter && !props.lockedFilters.has('serviceTypes')) ||
        (props.showSeriesTypeFilter && !props.lockedFilters.has('seriesType'))) && (
        <div className="flex flex-wrap items-center gap-2">
          {!props.lockedFilters.has('series') && (
            <MultiCombobox
              options={seriesOptions}
              value={props.selectedSeriesIds.map(String)}
              onValueChange={(v: string[]) => props.onSeriesChange(v.map(Number))}
              placeholder="All Series"
              selectedLabel="Series"
              disabled={props.seriesLoading ?? false}
              multiple
              isOpen={openDropdown === 'series'}
              onOpenChange={(open: boolean) => setOpenDropdown(open ? 'series' : null)}
            />
          )}
          {!props.lockedFilters.has('speaker') && (
            <MultiCombobox
              options={speakerOptions}
              value={props.selectedSpeakerIds.map(String)}
              onValueChange={(v: string[]) => props.onSpeakerChange(v.map(Number))}
              placeholder="All Speakers"
              selectedLabel="Speakers"
              disabled={props.speakersLoading ?? false}
              multiple
              isOpen={openDropdown === 'speaker'}
              onOpenChange={(open: boolean) => setOpenDropdown(open ? 'speaker' : null)}
            />
          )}
          {!props.lockedFilters.has('book') && (
            <MultiCombobox
              options={bookOptions}
              value={props.selectedBookIds.map(String)}
              onValueChange={(v: string[]) =>
                props.onBookChange(v.filter((val) => !val.startsWith('__group_')).map(Number))
              }
              placeholder="All Books"
              selectedLabel="Books"
              disabled={props.booksLoading ?? false}
              multiple
              isOpen={openDropdown === 'book'}
              onOpenChange={(open: boolean) => setOpenDropdown(open ? 'book' : null)}
            />
          )}
          {!props.lockedFilters.has('serviceTypes') && props.showServiceTypeFilter && (
            <MultiCombobox
              options={serviceTypeOptions}
              value={props.selectedServiceTypeIds.map(String)}
              onValueChange={(v: string[]) => props.onServiceTypesChange(v.map(Number))}
              placeholder="Service Types"
              selectedLabel="Service Types"
              disabled={props.serviceTypesLoading ?? false}
              multiple
              isOpen={openDropdown === 'serviceType'}
              onOpenChange={(open: boolean) => setOpenDropdown(open ? 'serviceType' : null)}
            />
          )}
          {!props.lockedFilters.has('seriesType') && props.showSeriesTypeFilter && (
            <MultiCombobox
              options={seriesTypeOptions}
              value={props.selectedSeriesTypeIds.map(String)}
              onValueChange={(v: string[]) => props.onSeriesTypeChange(v.map(Number))}
              placeholder="Series Types"
              selectedLabel="Series Types"
              disabled={props.seriesTypesLoading ?? false}
              multiple
              isOpen={openDropdown === 'seriesType'}
              onOpenChange={(open: boolean) => setOpenDropdown(open ? 'seriesType' : null)}
            />
          )}
        </div>
      )}

      {/* Row 3: Date range + clear all */}
      {!(props.lockedFilters.has('from') && props.lockedFilters.has('to')) && (
        <div className="flex items-center gap-3">
          {!props.lockedFilters.has('from') && (
            <DateRangePicker
              from={props.from}
              to={props.to}
              onRangeChange={(from, to) => props.onDateRangeChange(from || null, to || null)}
            />
          )}
          <div className="flex-1" />
          {props.hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={props.onClearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {props.hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              {
                lockedKey: 'series',
                ids: props.selectedSeriesIds,
                options: seriesOptions,
                onChange: props.onSeriesChange,
                fallback: 'Series',
                noun: 'series',
              },
              {
                lockedKey: 'speaker',
                ids: props.selectedSpeakerIds,
                options: speakerOptions,
                onChange: props.onSpeakerChange,
                fallback: 'Speaker',
                noun: 'speaker',
              },
              {
                lockedKey: 'book',
                ids: props.selectedBookIds,
                options: bookOptions,
                onChange: props.onBookChange,
                fallback: 'Book',
                noun: 'book',
              },
              {
                lockedKey: 'serviceTypes',
                ids: props.selectedServiceTypeIds,
                options: serviceTypeOptions,
                onChange: props.onServiceTypesChange,
                fallback: 'Service Type',
                noun: 'service type',
              },
              {
                lockedKey: 'seriesType',
                ids: props.selectedSeriesTypeIds,
                options: seriesTypeOptions,
                onChange: props.onSeriesTypeChange,
                fallback: 'Series Type',
                noun: 'series type',
              },
            ] as const
          ).flatMap(({ lockedKey, ids, options, onChange, fallback, noun }) =>
            props.lockedFilters.has(lockedKey)
              ? []
              : ids.map((id) => {
                  const label = options.find((o) => o.value === String(id))?.label ?? fallback;
                  return (
                    <FilterChip
                      key={`${lockedKey}-${id}`}
                      label={label}
                      ariaLabel={`Remove ${options.find((o) => o.value === String(id))?.label ?? noun} filter`}
                      onRemove={() => onChange(ids.filter((x) => x !== id))}
                    />
                  );
                }),
          )}
          {!props.lockedFilters.has('search') && props.search && (
            <FilterChip
              label={<>&ldquo;{props.search}&rdquo;</>}
              ariaLabel="Remove search filter"
              onRemove={() => props.onSearchChange('')}
              variant="secondary"
            />
          )}
        </div>
      )}
    </div>
  );
}
