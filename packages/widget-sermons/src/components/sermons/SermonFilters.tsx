import { useRef, useMemo, useState } from 'react';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Badge,
    Button,
    MultiCombobox,
} from '@perimeter-widgets/shared';
import type { MultiComboboxOption } from '@perimeter-widgets/shared';
import { DateRangePicker } from '../ui/DateRangePicker';
import { X, Search } from 'lucide-react';
import { groupBooksByTestament } from '../../lib/bible-books';
import type {
    Speaker,
    Book,
    SeriesListItem,
    ServiceType,
    SeriesType,
    SortField,
    SortOrder,
} from '../../types';

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
    seriesLoading?: boolean;
    speakersLoading?: boolean;
    booksLoading?: boolean;
    serviceTypesLoading?: boolean;
    seriesTypesLoading?: boolean;
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
}

export function SermonFilters(props: SermonFiltersProps) {
    // Ref to track pending from value so onToChange doesn't use stale props
    // (DateRangePicker calls onFromChange then onToChange synchronously)
    const pendingFrom = useRef(props.from);

    // Only one filter dropdown open at a time
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const seriesOptions: MultiComboboxOption[] = props.seriesList.map((s) => ({
        value: String(s.id),
        label: s.displayTitle ?? s.title,
    }));
    const speakerOptions: MultiComboboxOption[] = props.speakers.map((s) => ({
        value: String(s.id),
        label: s.name,
    }));

    // Bible books: sorted in canonical order with OT/NT group headers
    const bookOptions: MultiComboboxOption[] = useMemo(() => {
        const groups = groupBooksByTestament(props.books);
        return groups.flatMap((group) => [
            {
                value: `__group_${group.label}`,
                label: group.label,
                disabled: true,
                isGroupHeader: true,
            },
            ...group.options,
        ]);
    }, [props.books]);

    const serviceTypeOptions: MultiComboboxOption[] = props.serviceTypes.map(
        (st) => ({
            value: String(st.id),
            label: st.name,
        }),
    );

    const seriesTypeOptions: MultiComboboxOption[] = props.seriesTypes.map(
        (st) => ({
            value: String(st.id),
            label: st.name,
        }),
    );

    return (
        <div className='space-y-3'>
            {/* Row 1: Search */}
            {!props.lockedFilters.has('search') && (
                <InputGroup>
                    <InputGroupAddon align='inline-start'>
                        <Search />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={props.search}
                        onChange={(e) => props.onSearchChange(e.target.value)}
                        placeholder='Search sermons...'
                    />
                </InputGroup>
            )}

            {/* Row 2: Filter dropdowns */}
            {(!props.lockedFilters.has('series')
                || !props.lockedFilters.has('speaker')
                || !props.lockedFilters.has('book')
                || (props.showServiceTypeFilter
                    && !props.lockedFilters.has('serviceTypes'))
                || (props.showSeriesTypeFilter
                    && !props.lockedFilters.has('seriesType'))) && (
                <div className='flex items-center gap-2'>
                    {!props.lockedFilters.has('series') && (
                        <MultiCombobox
                            options={seriesOptions}
                            value={props.selectedSeriesIds.map(String)}
                            onValueChange={(v) =>
                                props.onSeriesChange(v.map(Number))
                            }
                            placeholder='All Series'
                            selectedLabel='Series'
                            disabled={props.seriesLoading}
                            className='flex-1'
                            multiple
                            isOpen={openDropdown === 'series'}
                            onOpenChange={(open) =>
                                setOpenDropdown(open ? 'series' : null)
                            }
                        />
                    )}
                    {!props.lockedFilters.has('speaker') && (
                        <MultiCombobox
                            options={speakerOptions}
                            value={props.selectedSpeakerIds.map(String)}
                            onValueChange={(v) =>
                                props.onSpeakerChange(v.map(Number))
                            }
                            placeholder='All Speakers'
                            selectedLabel='Speakers'
                            disabled={props.speakersLoading}
                            className='flex-1'
                            multiple
                            isOpen={openDropdown === 'speaker'}
                            onOpenChange={(open) =>
                                setOpenDropdown(open ? 'speaker' : null)
                            }
                        />
                    )}
                    {!props.lockedFilters.has('book') && (
                        <MultiCombobox
                            options={bookOptions}
                            value={props.selectedBookIds.map(String)}
                            onValueChange={(v) =>
                                props.onBookChange(
                                    v
                                        .filter(
                                            (val) =>
                                                !val.startsWith('__group_'),
                                        )
                                        .map(Number),
                                )
                            }
                            placeholder='All Books'
                            selectedLabel='Books'
                            disabled={props.booksLoading}
                            className='flex-1'
                            multiple
                            isOpen={openDropdown === 'book'}
                            onOpenChange={(open) =>
                                setOpenDropdown(open ? 'book' : null)
                            }
                        />
                    )}
                    {!props.lockedFilters.has('serviceTypes')
                        && props.showServiceTypeFilter && (
                            <MultiCombobox
                                options={serviceTypeOptions}
                                value={props.selectedServiceTypeIds.map(String)}
                                onValueChange={(v) =>
                                    props.onServiceTypesChange(v.map(Number))
                                }
                                placeholder='Service Types'
                                selectedLabel='Service Types'
                                disabled={props.serviceTypesLoading}
                                className='flex-1'
                                multiple
                                isOpen={openDropdown === 'serviceType'}
                                onOpenChange={(open) =>
                                    setOpenDropdown(open ? 'serviceType' : null)
                                }
                            />
                        )}
                    {!props.lockedFilters.has('seriesType')
                        && props.showSeriesTypeFilter && (
                            <MultiCombobox
                                options={seriesTypeOptions}
                                value={props.selectedSeriesTypeIds.map(String)}
                                onValueChange={(v) =>
                                    props.onSeriesTypeChange(v.map(Number))
                                }
                                placeholder='Series Types'
                                selectedLabel='Series Types'
                                disabled={props.seriesTypesLoading}
                                className='flex-1'
                                multiple
                                isOpen={openDropdown === 'seriesType'}
                                onOpenChange={(open) =>
                                    setOpenDropdown(open ? 'seriesType' : null)
                                }
                            />
                        )}
                </div>
            )}

            {/* Row 3: Date range + clear all */}
            {!(
                props.lockedFilters.has('from') && props.lockedFilters.has('to')
            ) && (
                <div className='flex items-center gap-3'>
                    {!props.lockedFilters.has('from') && (
                        <DateRangePicker
                            from={props.from}
                            to={props.to}
                            onFromChange={(from) => {
                                pendingFrom.current = from;
                                props.onDateRangeChange(from, props.to);
                            }}
                            onToChange={(to) =>
                                props.onDateRangeChange(pendingFrom.current, to)
                            }
                        />
                    )}
                    <div className='flex-1' />
                    {props.hasActiveFilters && (
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={props.onClearFilters}
                        >
                            <X className='h-3.5 w-3.5' />
                            Clear All
                        </Button>
                    )}
                </div>
            )}

            {/* Active filter chips */}
            {props.hasActiveFilters && (
                <div className='flex flex-wrap gap-1.5'>
                    {!props.lockedFilters.has('series')
                        && props.selectedSeriesIds.map((id) => (
                            <button
                                key={`series-${id}`}
                                type='button'
                                onClick={() =>
                                    props.onSeriesChange(
                                        props.selectedSeriesIds.filter(
                                            (x) => x !== id,
                                        ),
                                    )
                                }
                                className='inline-flex'
                                aria-label={`Remove ${seriesOptions.find((o) => o.value === String(id))?.label ?? 'series'} filter`}
                            >
                                <Badge variant='default'>
                                    {seriesOptions.find(
                                        (o) => o.value === String(id),
                                    )?.label ?? 'Series'}{' '}
                                    <X className='h-3 w-3' />
                                </Badge>
                            </button>
                        ))}
                    {!props.lockedFilters.has('speaker')
                        && props.selectedSpeakerIds.map((id) => (
                            <button
                                key={`speaker-${id}`}
                                type='button'
                                onClick={() =>
                                    props.onSpeakerChange(
                                        props.selectedSpeakerIds.filter(
                                            (x) => x !== id,
                                        ),
                                    )
                                }
                                className='inline-flex'
                                aria-label={`Remove ${speakerOptions.find((o) => o.value === String(id))?.label ?? 'speaker'} filter`}
                            >
                                <Badge variant='default'>
                                    {speakerOptions.find(
                                        (o) => o.value === String(id),
                                    )?.label ?? 'Speaker'}{' '}
                                    <X className='h-3 w-3' />
                                </Badge>
                            </button>
                        ))}
                    {!props.lockedFilters.has('book')
                        && props.selectedBookIds.map((id) => (
                            <button
                                key={`book-${id}`}
                                type='button'
                                onClick={() =>
                                    props.onBookChange(
                                        props.selectedBookIds.filter(
                                            (x) => x !== id,
                                        ),
                                    )
                                }
                                className='inline-flex'
                                aria-label={`Remove ${bookOptions.find((o) => o.value === String(id))?.label ?? 'book'} filter`}
                            >
                                <Badge variant='default'>
                                    {bookOptions.find(
                                        (o) => o.value === String(id),
                                    )?.label ?? 'Book'}{' '}
                                    <X className='h-3 w-3' />
                                </Badge>
                            </button>
                        ))}
                    {!props.lockedFilters.has('serviceTypes')
                        && props.selectedServiceTypeIds.map((id) => (
                            <button
                                key={`st-${id}`}
                                type='button'
                                onClick={() =>
                                    props.onServiceTypesChange(
                                        props.selectedServiceTypeIds.filter(
                                            (x) => x !== id,
                                        ),
                                    )
                                }
                                className='inline-flex'
                                aria-label={`Remove ${serviceTypeOptions.find((o) => o.value === String(id))?.label ?? 'service type'} filter`}
                            >
                                <Badge variant='default'>
                                    {serviceTypeOptions.find(
                                        (o) => o.value === String(id),
                                    )?.label ?? 'Service Type'}{' '}
                                    <X className='h-3 w-3' />
                                </Badge>
                            </button>
                        ))}
                    {!props.lockedFilters.has('seriesType')
                        && props.selectedSeriesTypeIds.map((id) => (
                            <button
                                key={`srt-${id}`}
                                type='button'
                                onClick={() =>
                                    props.onSeriesTypeChange(
                                        props.selectedSeriesTypeIds.filter(
                                            (x) => x !== id,
                                        ),
                                    )
                                }
                                className='inline-flex'
                                aria-label={`Remove ${seriesTypeOptions.find((o) => o.value === String(id))?.label ?? 'series type'} filter`}
                            >
                                <Badge variant='default'>
                                    {seriesTypeOptions.find(
                                        (o) => o.value === String(id),
                                    )?.label ?? 'Series Type'}{' '}
                                    <X className='h-3 w-3' />
                                </Badge>
                            </button>
                        ))}
                    {!props.lockedFilters.has('search') && props.search && (
                        <button
                            type='button'
                            onClick={() => props.onSearchChange('')}
                            className='inline-flex'
                            aria-label='Remove search filter'
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
