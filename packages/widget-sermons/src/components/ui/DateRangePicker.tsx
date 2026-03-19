import { useState, useMemo, useCallback } from 'react';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    X,
    Clock,
    ArrowRight,
} from 'lucide-react';
import { DateTime, Info, type DurationLike } from 'luxon';
import { cn } from '@perimeter-widgets/shared';
import { Modal } from './Modal';

export interface DateRangePreset {
    label: string;
    duration: DurationLike;
}

export interface DateRangePickerProps {
    from: string;
    to: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    mode?: 'date' | 'datetime';
    placeholder?: string;
    clearable?: boolean;
    className?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    presets?: DateRangePreset[];
}

const WEEKDAY_LABELS = Info.weekdays('short').map((d) => d.slice(0, 2));

type ActiveSide = 'start' | 'end';

/**
 * Date range picker with a single trigger button that opens a modal.
 * Shows two date "pills" (From / To) at the top of the modal, with
 * the calendar below editing whichever pill is active.
 * Ported from perimeter-api helpdesk DateRangePicker.
 */
export function DateRangePicker({
    from,
    to,
    onFromChange,
    onToChange,
    mode = 'date',
    placeholder,
    clearable = false,
    className,
    disabled = false,
    fullWidth = false,
    presets,
}: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const startDate = useMemo(() => {
        if (!from) return null;
        const dt = DateTime.fromISO(from);
        return dt.isValid ? dt : null;
    }, [from]);

    const endDate = useMemo(() => {
        if (!to) return null;
        const dt = DateTime.fromISO(to);
        return dt.isValid ? dt : null;
    }, [to]);

    const formatDateDisplay = useCallback(
        (dt: DateTime) => {
            if (mode === 'datetime') {
                return dt.toFormat('MMM d, yyyy h:mm a');
            }
            return dt.toFormat('MMM d, yyyy');
        },
        [mode],
    );

    const displayText = useMemo(() => {
        if (startDate && endDate) {
            return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
        }
        if (startDate) {
            return `After ${formatDateDisplay(startDate)}`;
        }
        if (endDate) {
            return `Before ${formatDateDisplay(endDate)}`;
        }
        return null;
    }, [startDate, endDate, formatDateDisplay]);

    const effectivePlaceholder = placeholder ?? 'Select date range...';

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onFromChange('');
            onToChange('');
        },
        [onFromChange, onToChange],
    );

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const hasValue = from || to;

    return (
        <div className={cn(fullWidth ? 'w-full' : 'w-auto', className)}>
            <div
                className={cn(
                    'flex items-center gap-1',
                    fullWidth ? 'w-full' : 'w-auto',
                )}
            >
                <button
                    type='button'
                    disabled={disabled}
                    onClick={() => setIsOpen(true)}
                    className={cn(
                        'flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-[var(--color-background)] px-3 py-2',
                        'text-sm',
                        'transition-colors duration-200',
                        'border-[var(--color-input)]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/50 focus-visible:ring-offset-2',
                        'focus-visible:border-[var(--color-ring)]',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        clearable && hasValue && 'rounded-r-none border-r-0',
                    )}
                >
                    <Calendar className='h-3.5 w-3.5 shrink-0 text-stone-400' />
                    {displayText ?
                        <span className='flex-1 truncate text-left'>
                            {displayText}
                        </span>
                    :   <span className='flex-1 truncate text-left text-stone-400'>
                            {effectivePlaceholder}
                        </span>
                    }
                </button>
                {clearable && hasValue && (
                    <button
                        type='button'
                        onClick={handleClear}
                        className='flex h-10 items-center rounded-lg rounded-l-none border border-l-0 border-[var(--color-input)] bg-[var(--color-background)] px-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300'
                        aria-label='Clear date range'
                    >
                        <X className='h-3.5 w-3.5' />
                    </button>
                )}
            </div>

            <Modal
                open={isOpen}
                onClose={handleClose}
                size={presets?.length ? 'lg' : 'sm'}
            >
                <RangePanel
                    startValue={from}
                    endValue={to}
                    onApply={(start, end) => {
                        onFromChange(start);
                        onToChange(end);
                        handleClose();
                    }}
                    onClose={handleClose}
                    mode={mode}
                    presets={presets}
                />
            </Modal>
        </div>
    );
}

/* ─── Range Panel (modal body) ──────────────────────────────────────── */

function RangePanel({
    startValue,
    endValue,
    onApply,
    onClose,
    mode,
    presets,
}: {
    startValue: string;
    endValue: string;
    onApply: (start: string, end: string) => void;
    onClose: () => void;
    mode: 'date' | 'datetime';
    presets?: DateRangePreset[];
}) {
    const [draftStart, setDraftStart] = useState(startValue);
    const [draftEnd, setDraftEnd] = useState(endValue);
    const [activeSide, setActiveSide] = useState<ActiveSide>('start');

    const draftStartDate = useMemo(() => {
        if (!draftStart) return null;
        const dt = DateTime.fromISO(draftStart);
        return dt.isValid ? dt : null;
    }, [draftStart]);

    const draftEndDate = useMemo(() => {
        if (!draftEnd) return null;
        const dt = DateTime.fromISO(draftEnd);
        return dt.isValid ? dt : null;
    }, [draftEnd]);

    const handlePresetSelect = useCallback((preset: DateRangePreset) => {
        const fromValue = DateTime.now()
            .minus(preset.duration)
            .toFormat("yyyy-MM-dd'T'HH:mm");
        setDraftStart(fromValue);
        setDraftEnd('');
    }, []);

    const activeValue = activeSide === 'start' ? draftStart : draftEnd;
    const activeDate = activeSide === 'start' ? draftStartDate : draftEndDate;
    const activeOnChange = activeSide === 'start' ? setDraftStart : setDraftEnd;

    const minForActive =
        activeSide === 'end' && draftStart ? draftStart : undefined;
    const maxForActive =
        activeSide === 'start' && draftEnd ? draftEnd : undefined;

    const isDirty = draftStart !== startValue || draftEnd !== endValue;
    const hasSelection = draftStart || draftEnd;

    const formatPill = (dt: DateTime | null, label: string) => {
        if (!dt) return label;
        if (mode === 'datetime') {
            return dt.toFormat('MMM d, h:mm a');
        }
        return dt.toFormat('MMM d, yyyy');
    };

    const hasPresets = presets && presets.length > 0;

    return (
        <div>
            {/* Header */}
            <div className='mb-5 flex items-center justify-between border-b border-stone-200 py-5 dark:border-stone-700/60'>
                <span className='px-3 text-sm font-semibold text-stone-800 dark:text-stone-200'>
                    Select date range
                </span>
                <button
                    type='button'
                    onClick={onClose}
                    className='rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
                    aria-label='Close dialog'
                >
                    <X className='h-4 w-4' />
                </button>
            </div>

            {/* Two-column layout when presets exist, single column otherwise */}
            <div className={cn(hasPresets && 'flex gap-5')}>
                {/* Left panel — presets */}
                {hasPresets && (
                    <div className='flex w-36 shrink-0 flex-col gap-1.5 border-r border-stone-200 pr-5 dark:border-stone-700/60'>
                        <span className='mb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500'>
                            Quick select
                        </span>
                        {presets.map((preset) => (
                            <button
                                key={preset.label}
                                type='button'
                                onClick={() => handlePresetSelect(preset)}
                                className={cn(
                                    'rounded-lg px-3 py-2 text-left text-xs font-medium',
                                    'transition-all duration-150',
                                    'text-stone-600',
                                    'hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]',
                                    'active:scale-[0.97]',
                                    'dark:text-stone-400',
                                    'dark:hover:bg-[var(--color-primary)]/5 dark:hover:text-[var(--color-primary)]',
                                )}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Right panel — date selection */}
                <div className='min-w-0 flex-1'>
                    {/* From / To segmented control */}
                    <div className='mb-3 flex items-stretch gap-0 rounded-xl bg-stone-100 p-1 dark:bg-stone-800'>
                        {/* From pill */}
                        <button
                            type='button'
                            onClick={() => setActiveSide('start')}
                            className={cn(
                                'group relative flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left transition-all duration-150',
                                activeSide === 'start' ?
                                    'bg-white shadow-sm dark:bg-stone-700'
                                :   'hover:bg-stone-200/50 dark:hover:bg-stone-700/50',
                            )}
                        >
                            <div className='min-w-0 flex-1'>
                                <span
                                    className={cn(
                                        'block text-[10px] font-semibold uppercase tracking-wider',
                                        activeSide === 'start' ?
                                            'text-[var(--color-primary)]'
                                        :   'text-stone-400 dark:text-stone-500',
                                    )}
                                >
                                    From
                                </span>
                                <span
                                    className={cn(
                                        'block truncate text-sm',
                                        draftStartDate ?
                                            'font-medium text-stone-900 dark:text-stone-100'
                                        :   'text-stone-400 dark:text-stone-500',
                                    )}
                                >
                                    {formatPill(draftStartDate, 'Select start')}
                                </span>
                            </div>
                            {draftStartDate && (
                                <span
                                    role='button'
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDraftStart('');
                                        setActiveSide('start');
                                    }}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === 'Enter'
                                            || e.key === ' '
                                        ) {
                                            e.stopPropagation();
                                            setDraftStart('');
                                            setActiveSide('start');
                                        }
                                    }}
                                    className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-600 dark:hover:text-stone-300'
                                    aria-label='Clear start date'
                                >
                                    <X className='h-3 w-3' />
                                </span>
                            )}
                        </button>

                        {/* Arrow separator */}
                        <div className='flex items-center px-1'>
                            <ArrowRight className='h-3.5 w-3.5 text-stone-300 dark:text-stone-600' />
                        </div>

                        {/* To pill */}
                        <button
                            type='button'
                            onClick={() => setActiveSide('end')}
                            className={cn(
                                'group relative flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left transition-all duration-150',
                                activeSide === 'end' ?
                                    'bg-white shadow-sm dark:bg-stone-700'
                                :   'hover:bg-stone-200/50 dark:hover:bg-stone-700/50',
                            )}
                        >
                            <div className='min-w-0 flex-1'>
                                <span
                                    className={cn(
                                        'block text-[10px] font-semibold uppercase tracking-wider',
                                        activeSide === 'end' ?
                                            'text-[var(--color-primary)]'
                                        :   'text-stone-400 dark:text-stone-500',
                                    )}
                                >
                                    To
                                </span>
                                <span
                                    className={cn(
                                        'block truncate text-sm',
                                        draftEndDate ?
                                            'font-medium text-stone-900 dark:text-stone-100'
                                        :   'text-stone-400 dark:text-stone-500',
                                    )}
                                >
                                    {formatPill(draftEndDate, 'Now')}
                                </span>
                            </div>
                            {draftEndDate && (
                                <span
                                    role='button'
                                    tabIndex={0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDraftEnd('');
                                        setActiveSide('end');
                                    }}
                                    onKeyDown={(e) => {
                                        if (
                                            e.key === 'Enter'
                                            || e.key === ' '
                                        ) {
                                            e.stopPropagation();
                                            setDraftEnd('');
                                            setActiveSide('end');
                                        }
                                    }}
                                    className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-stone-600 dark:hover:text-stone-300'
                                    aria-label='Clear end date'
                                >
                                    <X className='h-3 w-3' />
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Calendar */}
                    <CalendarGrid
                        value={activeValue}
                        selectedDate={activeDate}
                        onChange={activeOnChange}
                        mode={mode}
                        min={minForActive}
                        max={maxForActive}
                        rangeStart={draftStartDate}
                        rangeEnd={draftEndDate}
                        activeSide={activeSide}
                        onSideSwitch={() =>
                            setActiveSide((s) =>
                                s === 'start' ? 'end' : 'start',
                            )
                        }
                    />
                </div>
            </div>

            {/* Footer */}
            <div className='mt-5 flex items-center gap-3 border-t border-stone-200 pt-5 dark:border-stone-700/60'>
                <button
                    type='button'
                    onClick={() => {
                        setDraftStart('');
                        setDraftEnd('');
                    }}
                    className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        hasSelection ?
                            'text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
                        :   'pointer-events-none text-stone-300 dark:text-stone-600',
                    )}
                >
                    Clear
                </button>
                <div className='flex-1' />
                <button
                    type='button'
                    onClick={onClose}
                    className='rounded-lg px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
                >
                    Close
                </button>
                <button
                    type='button'
                    onClick={() => onApply(draftStart, draftEnd)}
                    className={cn(
                        'rounded-lg px-5 py-2 text-sm font-medium',
                        'transition-all duration-150 active:scale-[0.98]',
                        isDirty || hasSelection ?
                            'bg-[var(--color-primary)] text-white shadow-sm hover:opacity-90'
                        :   'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500',
                    )}
                >
                    Apply
                </button>
            </div>
        </div>
    );
}

/* ─── Calendar Grid ─────────────────────────────────────────────────── */

function CalendarGrid({
    value,
    selectedDate,
    onChange,
    mode,
    min,
    max,
    rangeStart,
    rangeEnd,
    activeSide,
    onSideSwitch,
}: {
    value: string;
    selectedDate: DateTime | null;
    onChange: (value: string) => void;
    mode: 'date' | 'datetime';
    min?: string;
    max?: string;
    rangeStart: DateTime | null;
    rangeEnd: DateTime | null;
    activeSide: ActiveSide;
    onSideSwitch: () => void;
}) {
    const [calendarView, setCalendarView] = useState<DateTime>(
        () => selectedDate?.startOf('month') ?? DateTime.now().startOf('month'),
    );

    const today = useMemo(() => DateTime.now().startOf('day'), []);

    const minDate = useMemo(() => (min ? DateTime.fromISO(min) : null), [min]);
    const maxDate = useMemo(() => (max ? DateTime.fromISO(max) : null), [max]);

    const isDateDisabled = useCallback(
        (day: DateTime) => {
            if (minDate && day < minDate.startOf('day')) return true;
            if (maxDate && day > maxDate.startOf('day')) return true;
            return false;
        },
        [minDate, maxDate],
    );

    const calendarDays = useMemo(() => {
        const startOfMonth = calendarView.startOf('month');
        const startPad = startOfMonth.weekday - 1;
        const gridStart = startOfMonth.minus({ days: startPad });

        const days: DateTime[] = [];
        for (let i = 0; i < 42; i++) {
            days.push(gridStart.plus({ days: i }));
        }

        return days;
    }, [calendarView]);

    const handleDayClick = useCallback(
        (day: DateTime) => {
            if (isDateDisabled(day)) return;

            if (mode === 'datetime') {
                const time = selectedDate ?? DateTime.now();
                const combined = day.set({
                    hour: time.hour,
                    minute: time.minute,
                });
                onChange(combined.toFormat("yyyy-MM-dd'T'HH:mm"));
            } else {
                onChange(day.toFormat('yyyy-MM-dd'));
                onSideSwitch();
            }
        },
        [mode, selectedDate, onChange, isDateDisabled, onSideSwitch],
    );

    const handleTimeChange = useCallback(
        (hour: number, minute: number) => {
            const base = selectedDate ?? DateTime.now();
            const updated = base.set({ hour, minute });
            onChange(updated.toFormat("yyyy-MM-dd'T'HH:mm"));
        },
        [selectedDate, onChange],
    );

    const navigateMonth = useCallback((delta: number) => {
        setCalendarView((v) => v.plus({ months: delta }));
    }, []);

    const goToToday = useCallback(() => {
        setCalendarView(DateTime.now().startOf('month'));
    }, []);

    const isInRange = useCallback(
        (day: DateTime) => {
            if (!rangeStart || !rangeEnd) return false;
            const dayStart = day.startOf('day');
            return (
                dayStart >= rangeStart.startOf('day')
                && dayStart <= rangeEnd.startOf('day')
            );
        },
        [rangeStart, rangeEnd],
    );

    const isRangeStart = useCallback(
        (day: DateTime) =>
            rangeStart ? day.hasSame(rangeStart, 'day') : false,
        [rangeStart],
    );

    const isRangeEnd = useCallback(
        (day: DateTime) => (rangeEnd ? day.hasSame(rangeEnd, 'day') : false),
        [rangeEnd],
    );

    return (
        <div className='rounded-xl bg-stone-50/50 p-4 dark:bg-stone-800/30'>
            {/* Month navigation */}
            <div className='mb-2 flex items-center justify-between'>
                <button
                    type='button'
                    onClick={() => navigateMonth(-1)}
                    className='flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-white hover:text-stone-600 hover:shadow-sm dark:hover:bg-stone-700 dark:hover:text-stone-300'
                    aria-label='Previous month'
                >
                    <ChevronLeft className='h-4 w-4' />
                </button>

                <div className='flex items-center gap-1.5'>
                    <span className='text-sm font-semibold tracking-tight text-stone-800 dark:text-stone-200'>
                        {calendarView.toFormat('MMMM yyyy')}
                    </span>
                    {(calendarView.month !== today.month
                        || calendarView.year !== today.year) && (
                        <button
                            type='button'
                            onClick={goToToday}
                            className='rounded-md bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/20'
                        >
                            Today
                        </button>
                    )}
                </div>

                <button
                    type='button'
                    onClick={() => navigateMonth(1)}
                    className='flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-white hover:text-stone-600 hover:shadow-sm dark:hover:bg-stone-700 dark:hover:text-stone-300'
                    aria-label='Next month'
                >
                    <ChevronRight className='h-4 w-4' />
                </button>
            </div>

            {/* Weekday headers */}
            <div className='mb-0.5 grid grid-cols-7 text-center'>
                {WEEKDAY_LABELS.map((label) => (
                    <div
                        key={label}
                        className='py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500'
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* Day cells */}
            <div className='grid grid-cols-7'>
                {calendarDays.map((day) => {
                    const isCurrentMonth = day.month === calendarView.month;
                    const isSelected =
                        selectedDate && day.hasSame(selectedDate, 'day');
                    const isToday = day.hasSame(today, 'day');
                    const isDisabled = isDateDisabled(day);
                    const inRange = isInRange(day);
                    const isStart = isRangeStart(day);
                    const isEnd = isRangeEnd(day);

                    return (
                        <button
                            key={day.toISODate()}
                            type='button'
                            disabled={isDisabled}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                                'relative flex h-9 w-full items-center justify-center text-sm',
                                'transition-all duration-100',
                                // Range highlight
                                inRange
                                    && !isStart
                                    && !isEnd
                                    && 'bg-[var(--color-primary)]/8',
                                isStart
                                    && 'rounded-l-lg bg-[var(--color-primary)]/8',
                                isEnd
                                    && 'rounded-r-lg bg-[var(--color-primary)]/8',
                                isStart && isEnd && 'rounded-lg',
                                !inRange
                                    && !isStart
                                    && !isEnd
                                    && 'rounded-lg',
                                // Text & hover
                                !isCurrentMonth
                                    && 'text-stone-300 dark:text-stone-600',
                                isCurrentMonth
                                    && !isSelected
                                    && !isDisabled
                                    && 'text-stone-700 hover:bg-white hover:shadow-sm dark:text-stone-300 dark:hover:bg-stone-700',
                                isToday
                                    && !isSelected
                                    && 'font-bold text-[var(--color-primary)]',
                                isSelected
                                    && 'rounded-lg bg-[var(--color-primary)] font-semibold text-white shadow-sm',
                                isDisabled && 'cursor-not-allowed opacity-30',
                                !isDisabled && 'cursor-pointer',
                            )}
                        >
                            {day.day}
                            {isToday && (
                                <span
                                    className={cn(
                                        'absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                                        isSelected ?
                                            'bg-white'
                                        :   'bg-[var(--color-primary)]',
                                    )}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Time input */}
            {mode === 'datetime' && (
                <TimeInput
                    hour={selectedDate?.hour ?? DateTime.now().hour}
                    minute={selectedDate?.minute ?? DateTime.now().minute}
                    onTimeChange={handleTimeChange}
                    disabled={!value}
                    label={activeSide === 'start' ? 'Start time' : 'End time'}
                />
            )}
        </div>
    );
}

/* ─── Time Input (12-hour with AM/PM) ────────────────────────────────── */

function TimeInput({
    hour,
    minute,
    onTimeChange,
    disabled,
    label,
}: {
    hour: number;
    minute: number;
    onTimeChange: (hour: number, minute: number) => void;
    disabled: boolean;
    label?: string;
}) {
    const isPM = hour >= 12;
    const display12 =
        hour === 0 ? 12
        : hour > 12 ? hour - 12
        : hour;

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = Math.max(1, Math.min(12, parseInt(e.target.value) || 1));
        let h24: number;
        if (isPM) {
            h24 = raw === 12 ? 12 : raw + 12;
        } else {
            h24 = raw === 12 ? 0 : raw;
        }
        onTimeChange(h24, minute);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
        onTimeChange(hour, raw);
    };

    const togglePeriod = () => {
        const newHour = isPM ? hour - 12 : hour + 12;
        onTimeChange(newHour, minute);
    };

    return (
        <div
            className={cn(
                'mt-3 flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 shadow-sm dark:bg-stone-700',
                disabled && 'pointer-events-none opacity-40',
            )}
        >
            <Clock className='h-3.5 w-3.5 shrink-0 text-stone-400' />
            <span className='text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500'>
                {label ?? 'Time'}
            </span>
            <div className='ml-auto flex items-center gap-1.5'>
                <input
                    type='number'
                    min={1}
                    max={12}
                    value={display12.toString().padStart(2, '0')}
                    onChange={handleHourChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') e.currentTarget.blur();
                    }}
                    className='h-8 w-12 rounded-md border border-stone-200 bg-stone-50 px-1 text-center text-sm tabular-nums focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 dark:border-stone-600 dark:bg-stone-800'
                    aria-label={label ? `${label} hour` : 'Hour'}
                />
                <span className='text-sm font-bold text-stone-300 dark:text-stone-500'>
                    :
                </span>
                <input
                    type='number'
                    min={0}
                    max={59}
                    value={minute.toString().padStart(2, '0')}
                    onChange={handleMinuteChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') e.currentTarget.blur();
                    }}
                    className='h-8 w-12 rounded-md border border-stone-200 bg-stone-50 px-1 text-center text-sm tabular-nums focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 dark:border-stone-600 dark:bg-stone-800'
                    aria-label={label ? `${label} minute` : 'Minute'}
                />
                <div className='flex h-8 overflow-hidden rounded-md border border-stone-200 text-[11px] font-semibold dark:border-stone-600'>
                    <button
                        type='button'
                        onClick={!isPM ? undefined : togglePeriod}
                        className={cn(
                            'px-2.5 transition-colors',
                            !isPM ?
                                'bg-[var(--color-primary)] text-white'
                            :   'bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-700',
                        )}
                    >
                        AM
                    </button>
                    <button
                        type='button'
                        onClick={isPM ? undefined : togglePeriod}
                        className={cn(
                            'px-2.5 transition-colors',
                            isPM ?
                                'bg-[var(--color-primary)] text-white'
                            :   'bg-stone-50 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:bg-stone-800 dark:text-stone-500 dark:hover:bg-stone-700',
                        )}
                    >
                        PM
                    </button>
                </div>
            </div>
        </div>
    );
}
