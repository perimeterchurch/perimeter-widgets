import { useState } from 'react';
import {
    SearchInput,
    Badge,
    Button,
    MultiCombobox,
} from '@perimeter-widgets/shared';
import type { MultiComboboxOption } from '@perimeter-widgets/shared';
import { DateRangePicker } from '../ui/DateRangePicker';
import { SlidersHorizontal, X } from 'lucide-react';
import type {
    Speaker,
    Book,
    SeriesListItem,
    SortField,
    SortOrder,
} from '../../types';

export interface SermonFiltersProps {
    search: string;
    series: number | null;
    speaker: number | null;
    book: number | null;
    from: string;
    to: string;
    sort: SortField;
    order: SortOrder;
    hasActiveFilters: boolean;
    seriesList: SeriesListItem[];
    speakers: Speaker[];
    books: Book[];
    seriesLoading?: boolean;
    speakersLoading?: boolean;
    booksLoading?: boolean;
    onSearchChange: (value: string) => void;
    onSeriesChange: (value: number | null) => void;
    onSpeakerChange: (value: number | null) => void;
    onBookChange: (value: number | null) => void;
    onDateRangeChange: (from: string | null, to: string | null) => void;
    onSortChange: (sort: SortField, order: SortOrder) => void;
    onClearFilters: () => void;
}

export function SermonFilters(props: SermonFiltersProps) {
    const [showMore, setShowMore] = useState(false);

    const seriesOptions: MultiComboboxOption[] = props.seriesList.map((s) => ({
        value: String(s.id),
        label: s.displayTitle ?? s.title,
    }));
    const speakerOptions: MultiComboboxOption[] = props.speakers.map((s) => ({
        value: String(s.id),
        label: s.name,
    }));
    const bookOptions: MultiComboboxOption[] = props.books.map((b) => ({
        value: String(b.id),
        label: b.name,
    }));

    return (
        <div className='space-y-3'>
            {/* Inline filters: search, series, speaker, books */}
            <div className='flex flex-wrap items-center gap-2'>
                <SearchInput
                    value={props.search}
                    onChange={props.onSearchChange}
                    placeholder='Search sermons...'
                    className='min-w-[200px] flex-1'
                />
                <MultiCombobox
                    options={seriesOptions}
                    value={props.series != null ? String(props.series) : null}
                    onValueChange={(v) =>
                        props.onSeriesChange(v != null ? Number(v) : null)
                    }
                    placeholder='All Series'
                    disabled={props.seriesLoading}
                />
                <MultiCombobox
                    options={speakerOptions}
                    value={props.speaker != null ? String(props.speaker) : null}
                    onValueChange={(v) =>
                        props.onSpeakerChange(v != null ? Number(v) : null)
                    }
                    placeholder='All Speakers'
                    disabled={props.speakersLoading}
                />
                <MultiCombobox
                    options={bookOptions}
                    value={props.book != null ? String(props.book) : null}
                    onValueChange={(v) =>
                        props.onBookChange(v != null ? Number(v) : null)
                    }
                    placeholder='All Books'
                    disabled={props.booksLoading}
                />
                <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => setShowMore(!showMore)}
                >
                    <SlidersHorizontal className='h-4 w-4' />
                    {showMore ? 'Less' : 'Date Range'}
                </Button>
            </div>

            {/* Expandable: date range only */}
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
                    {props.series && (
                        <button
                            type='button'
                            onClick={() => props.onSeriesChange(null)}
                            className='inline-flex'
                        >
                            <Badge variant='primary' size='sm'>
                                {seriesOptions.find(
                                    (o) => o.value === String(props.series),
                                )?.label ?? 'Series'}{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    )}
                    {props.speaker && (
                        <button
                            type='button'
                            onClick={() => props.onSpeakerChange(null)}
                            className='inline-flex'
                        >
                            <Badge variant='primary' size='sm'>
                                {speakerOptions.find(
                                    (o) => o.value === String(props.speaker),
                                )?.label ?? 'Speaker'}{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    )}
                    {props.book && (
                        <button
                            type='button'
                            onClick={() => props.onBookChange(null)}
                            className='inline-flex'
                        >
                            <Badge variant='primary' size='sm'>
                                {bookOptions.find(
                                    (o) => o.value === String(props.book),
                                )?.label ?? 'Book'}{' '}
                                <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    )}
                    {props.search && (
                        <button
                            type='button'
                            onClick={() => props.onSearchChange('')}
                            className='inline-flex'
                        >
                            <Badge variant='secondary' size='sm'>
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
