import { useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Badge,
    Button,
} from '@perimeter-widgets/shared';
import { FilterCombobox, type FilterOption } from '../ui/FilterCombobox';
import { DateRangePicker } from '../ui/DateRangePicker';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import type {
    Speaker,
    Book,
    SeriesListItem,
    ServiceType,
    SortField,
    SortOrder,
} from '../../types';

export interface SermonFiltersProps {
    search: string;
    selectedSeriesIds: number[];
    selectedSpeakerIds: number[];
    selectedBookIds: number[];
    selectedServiceTypeIds: number[];
    from: string;
    to: string;
    sort: SortField;
    order: SortOrder;
    hasActiveFilters: boolean;
    seriesList: SeriesListItem[];
    speakers: Speaker[];
    books: Book[];
    serviceTypes: ServiceType[];
    showServiceTypeFilter: boolean;
    onSearchChange: (value: string) => void;
    onToggleSeries: (id: number) => void;
    onToggleSpeaker: (id: number) => void;
    onToggleBook: (id: number) => void;
    onToggleServiceType: (id: number) => void;
    onDateRangeChange: (from: string | null, to: string | null) => void;
    onSortChange: (sort: SortField, order: SortOrder) => void;
    onClearFilters: () => void;
}

export function SermonFilters(props: SermonFiltersProps) {
    const [showMore, setShowMore] = useState(false);

    const seriesOptions: FilterOption[] = props.seriesList.map((s) => ({
        value: s.id,
        label: s.displayTitle ?? s.title,
    }));
    const speakerOptions: FilterOption[] = props.speakers.map((s) => ({
        value: s.id,
        label: s.name,
    }));
    const bookOptions: FilterOption[] = props.books.map((b) => ({
        value: b.id,
        label: b.name,
    }));
    const serviceTypeOptions: FilterOption[] = props.serviceTypes.map((st) => ({
        value: st.id,
        label: st.name,
    }));

    return (
        <div className='space-y-3'>
            {/* Inline filters */}
            <div className='flex flex-wrap items-center gap-2'>
                <InputGroup className='min-w-[200px] flex-1'>
                    <InputGroupAddon align='inline-start'>
                        <Search />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={props.search}
                        onChange={(e) => props.onSearchChange(e.target.value)}
                        placeholder='Search sermons...'
                    />
                </InputGroup>
                <FilterCombobox
                    options={seriesOptions}
                    selected={props.selectedSeriesIds}
                    onToggle={props.onToggleSeries}
                    placeholder='Series'
                />
                <FilterCombobox
                    options={speakerOptions}
                    selected={props.selectedSpeakerIds}
                    onToggle={props.onToggleSpeaker}
                    placeholder='Speakers'
                />
                <FilterCombobox
                    options={bookOptions}
                    selected={props.selectedBookIds}
                    onToggle={props.onToggleBook}
                    placeholder='Books'
                />
                {props.showServiceTypeFilter && (
                    <FilterCombobox
                        options={serviceTypeOptions}
                        selected={props.selectedServiceTypeIds}
                        onToggle={props.onToggleServiceType}
                        placeholder='Service Types'
                    />
                )}
                <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => setShowMore(!showMore)}
                >
                    <SlidersHorizontal className='h-4 w-4' />
                    {showMore ? 'Less' : 'Date Range'}
                </Button>
            </div>

            {/* Expandable: date range */}
            {showMore && (
                <div className='flex flex-wrap items-center gap-3 rounded-lg bg-[var(--color-muted)] p-3'>
                    <DateRangePicker
                        from={props.from}
                        to={props.to}
                        onFromChange={(from) =>
                            props.onDateRangeChange(from, props.to)
                        }
                        onToChange={(to) =>
                            props.onDateRangeChange(props.from, to)
                        }
                    />
                    {props.hasActiveFilters && (
                        <button
                            type='button'
                            onClick={props.onClearFilters}
                            className='text-sm text-[var(--color-error)] underline hover:opacity-80'
                        >
                            Clear All
                        </button>
                    )}
                </div>
            )}

            {/* Active filter chips */}
            {props.hasActiveFilters && (
                <div className='flex flex-wrap gap-1.5'>
                    {props.selectedSeriesIds.map((id) => (
                        <button
                            key={`series-${id}`}
                            type='button'
                            onClick={() => props.onToggleSeries(id)}
                            className='inline-flex'
                        >
                            <Badge variant='default'>
                                {seriesOptions.find((o) => o.value === id)
                                    ?.label ?? 'Series'}{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    ))}
                    {props.selectedSpeakerIds.map((id) => (
                        <button
                            key={`speaker-${id}`}
                            type='button'
                            onClick={() => props.onToggleSpeaker(id)}
                            className='inline-flex'
                        >
                            <Badge variant='default'>
                                {speakerOptions.find((o) => o.value === id)
                                    ?.label ?? 'Speaker'}{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    ))}
                    {props.selectedBookIds.map((id) => (
                        <button
                            key={`book-${id}`}
                            type='button'
                            onClick={() => props.onToggleBook(id)}
                            className='inline-flex'
                        >
                            <Badge variant='default'>
                                {bookOptions.find((o) => o.value === id)
                                    ?.label ?? 'Book'}{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    ))}
                    {props.selectedServiceTypeIds.map((id) => (
                        <button
                            key={`st-${id}`}
                            type='button'
                            onClick={() => props.onToggleServiceType(id)}
                            className='inline-flex'
                        >
                            <Badge variant='default'>
                                {serviceTypeOptions.find((o) => o.value === id)
                                    ?.label ?? 'Service Type'}{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    ))}
                    {props.search && (
                        <button
                            type='button'
                            onClick={() => props.onSearchChange('')}
                            className='inline-flex'
                        >
                            <Badge variant='secondary'>
                                &ldquo;{props.search}&rdquo;{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
