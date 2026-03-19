import { useState } from 'react';
import {
    SearchInput,
    ComboSelect,
    IconSelect,
    DateRangePicker,
    Badge,
    Button,
} from '@perimeter-widgets/shared';
import type { IconSelectOption } from '@perimeter-widgets/shared';
import {
    SlidersHorizontal,
    X,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    ArrowDownAZ,
    ArrowUpZA,
} from 'lucide-react';
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
    campus: number | null;
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
    onCampusChange: (value: number | null) => void;
    onDateRangeChange: (from: string | null, to: string | null) => void;
    onSortChange: (sort: SortField, order: SortOrder) => void;
    onClearFilters: () => void;
}

const SORT_OPTIONS: IconSelectOption<string>[] = [
    {
        value: 'date-desc',
        label: 'Date: Newest',
        icon: <ArrowDownWideNarrow className='h-4 w-4' />,
    },
    {
        value: 'date-asc',
        label: 'Date: Oldest',
        icon: <ArrowUpNarrowWide className='h-4 w-4' />,
    },
    {
        value: 'title-asc',
        label: 'Title: A-Z',
        icon: <ArrowDownAZ className='h-4 w-4' />,
    },
    {
        value: 'title-desc',
        label: 'Title: Z-A',
        icon: <ArrowUpZA className='h-4 w-4' />,
    },
];

const CAMPUS_OPTIONS = [
    { value: 1 as number, label: 'Buckhead' },
    { value: 2 as number, label: 'Brookhaven' },
    { value: 3 as number, label: 'Peachtree Corners' },
];

export function SermonFilters(props: SermonFiltersProps) {
    const [showMore, setShowMore] = useState(false);
    const sortValue = `${props.sort}-${props.order}`;
    const handleSortChange = (value: string) => {
        const [sort, order] = value.split('-') as [SortField, SortOrder];
        props.onSortChange(sort, order);
    };

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
            <div className='flex flex-wrap items-center gap-2'>
                <SearchInput
                    value={props.search}
                    onChange={props.onSearchChange}
                    placeholder='Search sermons...'
                    className='min-w-[200px] flex-1'
                />
                <ComboSelect<number>
                    value={props.series ?? ''}
                    onChange={(v) => props.onSeriesChange(v === '' ? null : v)}
                    options={seriesOptions}
                    placeholder='All Series'
                    showAllOption
                    allOptionLabel='All Series'
                    loading={props.seriesLoading}
                />
                <ComboSelect<number>
                    value={props.speaker ?? ''}
                    onChange={(v) => props.onSpeakerChange(v === '' ? null : v)}
                    options={speakerOptions}
                    placeholder='All Speakers'
                    showAllOption
                    allOptionLabel='All Speakers'
                    loading={props.speakersLoading}
                />
                <IconSelect
                    value={sortValue}
                    onChange={handleSortChange}
                    options={SORT_OPTIONS}
                />
                <Button
                    variant='secondary'
                    size='sm'
                    onClick={() => setShowMore(!showMore)}
                >
                    <SlidersHorizontal className='h-4 w-4' />
                    More Filters
                </Button>
            </div>

            {showMore && (
                <div className='flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 p-3 dark:bg-stone-900'>
                    <ComboSelect<number>
                        value={props.book ?? ''}
                        onChange={(v) =>
                            props.onBookChange(v === '' ? null : v)
                        }
                        options={bookOptions}
                        placeholder='All Books'
                        showAllOption
                        allOptionLabel='All Books'
                        loading={props.booksLoading}
                    />
                    <ComboSelect<number>
                        value={props.campus ?? ''}
                        onChange={(v) =>
                            props.onCampusChange(v === '' ? null : v)
                        }
                        options={CAMPUS_OPTIONS}
                        placeholder='All Campuses'
                        showAllOption
                        allOptionLabel='All Campuses'
                    />
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
                            className='text-sm text-red-500 underline hover:text-red-700'
                        >
                            Clear All
                        </button>
                    )}
                </div>
            )}

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
                            <Badge variant='primary' size='sm'>
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
                            <Badge variant='primary' size='sm'>
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
                            <Badge variant='secondary' size='sm'>
                                "{props.search}" <X className='h-3 w-3' />
                            </Badge>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
