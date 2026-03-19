import { useState, useMemo, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { DateTime, Info } from 'luxon';
import { cn } from '@perimeter-widgets/shared';
import { Modal, ModalFooter } from './Modal';

export interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
    mode?: 'date' | 'datetime';
    label?: string;
    placeholder?: string;
    clearable?: boolean;
    min?: string;
    max?: string;
    fullWidth?: boolean;
    className?: string;
    disabled?: boolean;
}

const WEEKDAY_LABELS = Info.weekdays('short').map((d) => d.slice(0, 2));

/**
 * Calendar-based date picker that opens in a modal dialog.
 * Supports date-only and datetime modes with month/year navigation.
 * Ported from perimeter-api helpdesk DatePicker.
 */
export function DatePicker({
    value,
    onChange,
    mode = 'date',
    placeholder,
    clearable = false,
    min,
    max,
    fullWidth = false,
    className,
    disabled = false,
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const selectedDate = useMemo(() => {
        if (!value) return null;
        const dt = DateTime.fromISO(value);
        return dt.isValid ? dt : null;
    }, [value]);

    const displayText = useMemo(() => {
        if (!selectedDate) return null;
        if (mode === 'datetime') {
            return selectedDate.toFormat('MMM d, yyyy h:mm a');
        }
        return selectedDate.toFormat('MMM d, yyyy');
    }, [selectedDate, mode]);

    const effectivePlaceholder =
        placeholder
        ?? (mode === 'datetime' ? 'Select date & time' : 'Select date');

    const handleClear = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            onChange('');
        },
        [onChange],
    );

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

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
                        clearable && value && 'rounded-r-none border-r-0',
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
                {clearable && value && (
                    <button
                        type='button'
                        onClick={handleClear}
                        className='flex h-10 items-center rounded-lg rounded-l-none border border-l-0 border-[var(--color-input)] bg-[var(--color-background)] px-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-300'
                        aria-label='Clear date'
                    >
                        <X className='h-3.5 w-3.5' />
                    </button>
                )}
            </div>

            <Modal
                open={isOpen}
                onClose={handleClose}
                size='sm'
            >
                <CalendarPanel
                    value={value}
                    selectedDate={selectedDate}
                    onChange={onChange}
                    onClose={handleClose}
                    mode={mode}
                    min={min}
                    max={max}
                />
            </Modal>
        </div>
    );
}

/* ─── Calendar Panel (modal body) ────────────────────────────────────── */

function CalendarPanel({
    value,
    selectedDate,
    onChange,
    onClose,
    mode,
    min,
    max,
}: {
    value: string;
    selectedDate: DateTime | null;
    onChange: (value: string) => void;
    onClose: () => void;
    mode: 'date' | 'datetime';
    min?: string;
    max?: string;
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
                onClose();
            }
        },
        [mode, selectedDate, onChange, onClose, isDateDisabled],
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

    return (
        <>
            {/* Month/year navigation */}
            <div className='mb-3 flex items-center justify-between'>
                <button
                    type='button'
                    onClick={() => navigateMonth(-1)}
                    className='flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300'
                    aria-label='Previous month'
                >
                    <ChevronLeft className='h-4 w-4' />
                </button>

                <div className='flex items-center gap-1.5'>
                    <span className='text-sm font-semibold text-stone-900 dark:text-stone-100'>
                        {calendarView.toFormat('MMMM yyyy')}
                    </span>
                    {(calendarView.month !== today.month
                        || calendarView.year !== today.year) && (
                        <button
                            type='button'
                            onClick={goToToday}
                            className='rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10'
                        >
                            Today
                        </button>
                    )}
                </div>

                <button
                    type='button'
                    onClick={() => navigateMonth(1)}
                    className='flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-300'
                    aria-label='Next month'
                >
                    <ChevronRight className='h-4 w-4' />
                </button>
            </div>

            {/* Weekday headers */}
            <div className='mb-1 grid grid-cols-7 text-center'>
                {WEEKDAY_LABELS.map((label) => (
                    <div
                        key={label}
                        className='py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400'
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className='grid grid-cols-7 gap-y-0.5'>
                {calendarDays.map((day) => {
                    const isCurrentMonth = day.month === calendarView.month;
                    const isSelected =
                        selectedDate && day.hasSame(selectedDate, 'day');
                    const isToday = day.hasSame(today, 'day');
                    const isDisabled = isDateDisabled(day);

                    return (
                        <button
                            key={day.toISODate()}
                            type='button'
                            disabled={isDisabled}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                                'relative flex h-9 w-full items-center justify-center rounded-md text-sm',
                                'transition-colors duration-100',
                                !isCurrentMonth
                                    && 'text-stone-300 dark:text-stone-600',
                                isCurrentMonth
                                    && !isSelected
                                    && !isDisabled
                                    && 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800',
                                isToday
                                    && !isSelected
                                    && 'font-semibold text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40',
                                isSelected
                                    && 'bg-[var(--color-primary)] text-white font-medium',
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

            {/* Time input + done button for datetime mode */}
            {mode === 'datetime' && (
                <TimeInput
                    hour={selectedDate?.hour ?? DateTime.now().hour}
                    minute={selectedDate?.minute ?? DateTime.now().minute}
                    onTimeChange={handleTimeChange}
                    disabled={!value}
                />
            )}

            <ModalFooter>
                {mode === 'datetime' ?
                    <button
                        type='button'
                        onClick={onClose}
                        className={cn(
                            'w-full rounded-lg px-4 py-2 text-sm font-medium',
                            'transition-colors',
                            value ?
                                'bg-[var(--color-primary)] text-white hover:opacity-90'
                            :   'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500',
                        )}
                        disabled={!value}
                    >
                        {value ? 'Done' : 'Select a date'}
                    </button>
                :   <button
                        type='button'
                        onClick={onClose}
                        className='w-full rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
                    >
                        Cancel
                    </button>
                }
            </ModalFooter>
        </>
    );
}

/* ─── Time Input (12-hour with AM/PM) ────────────────────────────────── */

function TimeInput({
    hour,
    minute,
    onTimeChange,
    disabled,
}: {
    hour: number;
    minute: number;
    onTimeChange: (hour: number, minute: number) => void;
    disabled: boolean;
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
                'mt-4 flex items-center justify-center gap-3 border-t border-stone-200 pt-4 dark:border-stone-700',
                disabled && 'pointer-events-none opacity-40',
            )}
        >
            <Clock className='h-4 w-4 shrink-0 text-stone-400' />
            <input
                type='number'
                min={1}
                max={12}
                value={display12.toString().padStart(2, '0')}
                onChange={handleHourChange}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') e.currentTarget.blur();
                }}
                className='h-9 w-14 rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50'
                aria-label='Hour'
            />
            <span className='text-sm font-bold text-stone-400'>:</span>
            <input
                type='number'
                min={0}
                max={59}
                value={minute.toString().padStart(2, '0')}
                onChange={handleMinuteChange}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') e.currentTarget.blur();
                }}
                className='h-9 w-14 rounded-md border border-[var(--color-input)] bg-[var(--color-background)] px-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50'
                aria-label='Minute'
            />
            <div className='flex h-9 overflow-hidden rounded-md border border-[var(--color-input)] text-xs font-medium'>
                <button
                    type='button'
                    onClick={!isPM ? undefined : togglePeriod}
                    className={cn(
                        'px-3 transition-colors',
                        !isPM ?
                            'bg-[var(--color-primary)] text-white'
                        :   'bg-[var(--color-background)] text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800',
                    )}
                >
                    AM
                </button>
                <button
                    type='button'
                    onClick={isPM ? undefined : togglePeriod}
                    className={cn(
                        'px-3 transition-colors',
                        isPM ?
                            'bg-[var(--color-primary)] text-white'
                        :   'bg-[var(--color-background)] text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800',
                    )}
                >
                    PM
                </button>
            </div>
        </div>
    );
}
