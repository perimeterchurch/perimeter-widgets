import { useState, useRef, useEffect } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    Badge,
    Button,
    Checkbox,
} from '@perimeter-widgets/shared';
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
    series: number | null;
    speaker: number | null;
    book: number | null;
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
    seriesLoading?: boolean;
    speakersLoading?: boolean;
    booksLoading?: boolean;
    serviceTypesLoading?: boolean;
    onSearchChange: (value: string) => void;
    onSeriesChange: (value: number | null) => void;
    onSpeakerChange: (value: number | null) => void;
    onBookChange: (value: number | null) => void;
    onToggleServiceType: (id: number) => void;
    onClearServiceTypes: () => void;
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
    const serviceTypeOptions = props.serviceTypes.map((st) => ({
        value: st.id,
        label: st.name,
    }));

    return (
        <div className='space-y-3'>
            {/* Inline filters: search, series, speaker, books */}
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
                <Select
                    value={props.series != null ? String(props.series) : ''}
                    onValueChange={(v) =>
                        props.onSeriesChange(
                            v == null || v === '' ? null : Number(v),
                        )
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder='All Series' />
                    </SelectTrigger>
                    <SelectContent align='start' alignItemWithTrigger={false}>
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
                        props.onSpeakerChange(
                            v == null || v === '' ? null : Number(v),
                        )
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder='All Speakers' />
                    </SelectTrigger>
                    <SelectContent align='start' alignItemWithTrigger={false}>
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
                        props.onBookChange(
                            v == null || v === '' ? null : Number(v),
                        )
                    }
                >
                    <SelectTrigger>
                        <SelectValue placeholder='All Books' />
                    </SelectTrigger>
                    <SelectContent align='start' alignItemWithTrigger={false}>
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
                {props.showServiceTypeFilter && (
                    <ServiceTypeMultiSelect
                        options={serviceTypeOptions}
                        selected={props.selectedServiceTypeIds}
                        onToggle={props.onToggleServiceType}
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
                    {props.selectedServiceTypeIds.map((id) => (
                        <button
                            key={id}
                            type='button'
                            onClick={() => props.onToggleServiceType(id)}
                            className='inline-flex'
                        >
                            <Badge variant='default'>
                                {serviceTypeOptions.find(
                                    (o) => o.value === id,
                                )?.label ?? 'Service Type'}{' '}
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

function ServiceTypeMultiSelect({
    options,
    selected,
    onToggle,
}: {
    options: { value: number; label: string }[];
    selected: number[];
    onToggle: (id: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const label =
        selected.length === 0 ? 'Service Types'
        : selected.length === 1 ?
            (options.find((o) => o.value === selected[0])?.label ??
            'Service Type')
        :   `${selected.length} Service Types`;

    return (
        <div ref={ref} className='relative'>
            <Button
                variant='outline'
                size='default'
                onClick={() => setOpen(!open)}
                className='text-sm whitespace-nowrap'
            >
                {label}
            </Button>
            {open && (
                <div className='absolute top-full left-0 z-50 mt-1 min-w-48 rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10'>
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type='button'
                            onClick={() => onToggle(opt.value)}
                            className='flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground'
                        >
                            <Checkbox
                                checked={selected.includes(opt.value)}
                                readOnly
                                className='pointer-events-none'
                            />
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
