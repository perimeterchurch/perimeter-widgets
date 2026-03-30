import { useState } from 'react';
import {
    Input,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Badge,
    Button,
} from '@perimeter-widgets/shared';
import { DateRangePicker } from '../ui/DateRangePicker';
import { SlidersHorizontal, X, Search } from 'lucide-react';
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

    const seriesOptions = props.seriesList.map((s) => ({
        value: s.id,
        label: s.displayTitle ?? s.title,
    }));
    const speakerOptions = props.speakers.map((s) => ({
        value: s.id,
        label: s.name,
    }));
    const bookOptions = props.books.map((b) => ({
        value: b.id,
        label: b.name,
    }));

    return (
        <div className='space-y-3'>
            {/* Inline filters: search, series, speaker, books */}
            <div className='flex flex-wrap items-center gap-2'>
                <div className='relative min-w-[200px] flex-1'>
                    <Search className='pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                        value={props.search}
                        onChange={(e) => props.onSearchChange(e.target.value)}
                        placeholder='Search sermons...'
                        className='pl-9'
                    />
                </div>
                <Select
                    value={props.series != null ? String(props.series) : ''}
                    onValueChange={(v) =>
                        props.onSeriesChange(v == null || v === '' ? null : Number(v))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder='All Series' />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=''>All Series</SelectItem>
                        {seriesOptions.map((opt) => (
                            <SelectItem
                                key={opt.value}
                                value={String(opt.value)}
                            >
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={props.speaker != null ? String(props.speaker) : ''}
                    onValueChange={(v) =>
                        props.onSpeakerChange(v == null || v === '' ? null : Number(v))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder='All Speakers' />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=''>All Speakers</SelectItem>
                        {speakerOptions.map((opt) => (
                            <SelectItem
                                key={opt.value}
                                value={String(opt.value)}
                            >
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select
                    value={props.book != null ? String(props.book) : ''}
                    onValueChange={(v) =>
                        props.onBookChange(v == null || v === '' ? null : Number(v))
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder='All Books' />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value=''>All Books</SelectItem>
                        {bookOptions.map((opt) => (
                            <SelectItem
                                key={opt.value}
                                value={String(opt.value)}
                            >
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                            <Badge variant='default'>
                                {seriesOptions.find(
                                    (o) => o.value === props.series,
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
                            <Badge variant='default'>
                                {speakerOptions.find(
                                    (o) => o.value === props.speaker,
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
                            <Badge variant='default'>
                                {bookOptions.find((o) => o.value === props.book)
                                    ?.label ?? 'Book'}{' '}
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
