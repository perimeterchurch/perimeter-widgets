/**
 * Month-grid calendar (+ optional time input) for the DateRangePicker.
 * Extracted verbatim from the former monolithic DateRangePicker so the split
 * is behavior-identical.
 */

import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { DateTime, Info } from 'luxon';
import { cn } from '@perimeter/ui/utils/cn';

const WEEKDAY_LABELS = Info.weekdays('short').map((d) => d.slice(0, 2));

export type ActiveSide = 'start' | 'end';

export function Calendar({
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
  min?: string | undefined;
  max?: string | undefined;
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
      return dayStart >= rangeStart.startOf('day') && dayStart <= rangeEnd.startOf('day');
    },
    [rangeStart, rangeEnd],
  );

  const isRangeStart = useCallback(
    (day: DateTime) => (rangeStart ? day.hasSame(rangeStart, 'day') : false),
    [rangeStart],
  );

  const isRangeEnd = useCallback(
    (day: DateTime) => (rangeEnd ? day.hasSame(rangeEnd, 'day') : false),
    [rangeEnd],
  );

  return (
    <div className="rounded-xl bg-muted/50 p-4">
      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-bg hover:text-fg hover:shadow-sm"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold tracking-tight text-fg">
            {calendarView.toFormat('MMMM yyyy')}
          </span>
          {(calendarView.month !== today.month || calendarView.year !== today.year) && (
            <button
              type="button"
              onClick={goToToday}
              className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              Today
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-bg hover:text-fg hover:shadow-sm"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-0.5 grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const isCurrentMonth = day.month === calendarView.month;
          const isSelected = selectedDate && day.hasSame(selectedDate, 'day');
          const isToday = day.hasSame(today, 'day');
          const isDisabled = isDateDisabled(day);
          const inRange = isInRange(day);
          const isStart = isRangeStart(day);
          const isEnd = isRangeEnd(day);

          return (
            <button
              key={day.toISODate()}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDayClick(day)}
              className={cn(
                'relative flex h-9 w-full items-center justify-center text-sm',
                'transition-all duration-100',
                // Range highlight
                inRange && !isStart && !isEnd && 'bg-primary/8',
                isStart && 'rounded-l-lg bg-primary/8',
                isEnd && 'rounded-r-lg bg-primary/8',
                isStart && isEnd && 'rounded-lg',
                !inRange && !isStart && !isEnd && 'rounded-lg',
                // Text & hover
                !isCurrentMonth && 'text-muted-fg opacity-60',
                isCurrentMonth &&
                  !isSelected &&
                  !isDisabled &&
                  'text-fg hover:bg-bg hover:shadow-sm',
                isToday && !isSelected && 'font-bold text-primary',
                isSelected && 'rounded-lg bg-primary font-semibold text-primary-fg shadow-sm',
                isDisabled && 'cursor-not-allowed opacity-30',
                !isDisabled && 'cursor-pointer',
              )}
            >
              {day.day}
              {isToday && (
                <span
                  className={cn(
                    'absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
                    isSelected ? 'bg-primary-fg' : 'bg-primary',
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
  label?: string | undefined;
}) {
  const isPM = hour >= 12;
  const display12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

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
        'mt-3 flex items-center justify-center gap-2 rounded-lg bg-bg px-3 py-2.5 shadow-sm',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-fg" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
        {label ?? 'Time'}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={12}
          value={display12.toString().padStart(2, '0')}
          onChange={handleHourChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          className="h-8 w-12 rounded-md border border-border bg-bg px-1 text-center text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          aria-label={label ? `${label} hour` : 'Hour'}
        />
        <span className="text-sm font-bold text-muted-fg">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={minute.toString().padStart(2, '0')}
          onChange={handleMinuteChange}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          className="h-8 w-12 rounded-md border border-border bg-bg px-1 text-center text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          aria-label={label ? `${label} minute` : 'Minute'}
        />
        <div className="flex h-8 overflow-hidden rounded-md border border-border text-[11px] font-semibold">
          <button
            type="button"
            onClick={!isPM ? undefined : togglePeriod}
            className={cn(
              'px-2.5 transition-colors',
              !isPM
                ? 'bg-primary text-primary-fg'
                : 'bg-bg text-muted-fg hover:bg-muted hover:text-fg',
            )}
          >
            AM
          </button>
          <button
            type="button"
            onClick={isPM ? undefined : togglePeriod}
            className={cn(
              'px-2.5 transition-colors',
              isPM
                ? 'bg-primary text-primary-fg'
                : 'bg-bg text-muted-fg hover:bg-muted hover:text-fg',
            )}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
}
