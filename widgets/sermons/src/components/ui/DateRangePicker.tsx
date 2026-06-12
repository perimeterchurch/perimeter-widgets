import { useState, useMemo, useCallback } from 'react';
import { Calendar as CalendarIcon, X, ArrowRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { cn } from '@perimeter/ui/utils/cn';
import { DateRangePopover } from './date-range/DateRangePopover';
import { Calendar, type ActiveSide } from './date-range/Calendar';
import { RangePresets, type DateRangePreset } from './date-range/RangePresets';

export type { DateRangePreset };

export interface DateRangePickerProps {
  from: string;
  to: string;
  /**
   * Fires once with the resulting (from, to) pair when the user applies a
   * change — clearing, picking presets, or hitting Apply on the calendar.
   * Empty strings mean "no value".
   */
  onRangeChange: (from: string, to: string) => void;
  mode?: 'date' | 'datetime' | undefined;
  placeholder?: string | undefined;
  clearable?: boolean | undefined;
  className?: string | undefined;
  disabled?: boolean | undefined;
  fullWidth?: boolean | undefined;
  presets?: DateRangePreset[] | undefined;
}

/**
 * Date range picker with a single trigger button that opens a popover.
 * Shows two date "pills" (From / To) at the top of the popover, with
 * the calendar below editing whichever pill is active.
 *
 * Composed from the self-contained `DateRangePopover` shell, the `Calendar`
 * month grid, and the `RangePresets` quick-select column (split out of the
 * former 761-line monolith — no longer depends on the shared `Modal`).
 * Ported from perimeter-api helpdesk DateRangePicker.
 */
export function DateRangePicker({
  from,
  to,
  onRangeChange,
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
      onRangeChange('', '');
    },
    [onRangeChange],
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const hasValue = from || to;

  return (
    <div className={cn(fullWidth ? 'w-full' : 'w-auto', className)}>
      <div className={cn('flex items-center gap-1', fullWidth ? 'w-full' : 'w-auto')}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          className={cn(
            'flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-border bg-transparent px-2.5 text-sm',
            'transition-colors hover:bg-muted/30',
            'focus-visible:outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            clearable && hasValue && 'rounded-r-none border-r-0',
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-fg" />
          {displayText ? (
            <span className="flex-1 truncate text-left">{displayText}</span>
          ) : (
            <span className="flex-1 truncate text-left text-muted-fg">{effectivePlaceholder}</span>
          )}
        </button>
        {clearable && hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-8 items-center rounded-lg rounded-l-none border border-l-0 border-border bg-transparent px-2 text-muted-fg transition-colors hover:bg-muted/30"
            aria-label="Clear date range"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <DateRangePopover open={isOpen} onClose={handleClose} size={presets?.length ? 'lg' : 'sm'}>
        <RangePanel
          startValue={from}
          endValue={to}
          onApply={(start, end) => {
            onRangeChange(start, end);
            handleClose();
          }}
          onClose={handleClose}
          mode={mode}
          presets={presets}
        />
      </DateRangePopover>
    </div>
  );
}

/* ─── Range Panel (popover body) ─────────────────────────────────────── */

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
  presets?: DateRangePreset[] | undefined;
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
    const fromValue = DateTime.now().minus(preset.duration).toFormat("yyyy-MM-dd'T'HH:mm");
    setDraftStart(fromValue);
    setDraftEnd('');
  }, []);

  const activeValue = activeSide === 'start' ? draftStart : draftEnd;
  const activeDate = activeSide === 'start' ? draftStartDate : draftEndDate;
  const activeOnChange = activeSide === 'start' ? setDraftStart : setDraftEnd;

  const minForActive = activeSide === 'end' && draftStart ? draftStart : undefined;
  const maxForActive = activeSide === 'start' && draftEnd ? draftEnd : undefined;

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
      <div className="mb-5 flex items-center justify-between border-b border-border py-5">
        <span className="px-3 text-sm font-semibold text-fg">Select date range</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-fg transition-colors hover:bg-muted hover:text-fg"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Two-column layout when presets exist, single column otherwise */}
      <div className={cn(hasPresets && 'flex gap-5')}>
        {/* Left panel — presets */}
        {hasPresets && <RangePresets presets={presets} onSelect={handlePresetSelect} />}

        {/* Right panel — date selection */}
        <div className="min-w-0 flex-1">
          {/* From / To segmented control */}
          <div className="mb-3 flex items-stretch gap-0 rounded-xl bg-muted p-1">
            {/* From pill */}
            <button
              type="button"
              onClick={() => setActiveSide('start')}
              className={cn(
                'group relative flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left transition-all duration-150',
                activeSide === 'start' ? 'bg-bg shadow-xs' : 'hover:bg-bg/50',
              )}
            >
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-2xs font-semibold uppercase tracking-wider',
                    activeSide === 'start' ? 'text-primary' : 'text-muted-fg',
                  )}
                >
                  From
                </span>
                <span
                  className={cn(
                    'block truncate text-sm',
                    draftStartDate ? 'font-medium text-fg' : 'text-muted-fg',
                  )}
                >
                  {formatPill(draftStartDate, 'Select start')}
                </span>
              </div>
              {draftStartDate && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDraftStart('');
                    setActiveSide('start');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      setDraftStart('');
                      setActiveSide('start');
                    }
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-muted hover:text-fg"
                  aria-label="Clear start date"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>

            {/* Arrow separator */}
            <div className="flex items-center px-1">
              <ArrowRight className="h-3.5 w-3.5 text-muted-fg" />
            </div>

            {/* To pill */}
            <button
              type="button"
              onClick={() => setActiveSide('end')}
              className={cn(
                'group relative flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left transition-all duration-150',
                activeSide === 'end' ? 'bg-bg shadow-xs' : 'hover:bg-bg/50',
              )}
            >
              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-2xs font-semibold uppercase tracking-wider',
                    activeSide === 'end' ? 'text-primary' : 'text-muted-fg',
                  )}
                >
                  To
                </span>
                <span
                  className={cn(
                    'block truncate text-sm',
                    draftEndDate ? 'font-medium text-fg' : 'text-muted-fg',
                  )}
                >
                  {formatPill(draftEndDate, 'Now')}
                </span>
              </div>
              {draftEndDate && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setDraftEnd('');
                    setActiveSide('end');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      setDraftEnd('');
                      setActiveSide('end');
                    }
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-muted hover:text-fg"
                  aria-label="Clear end date"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
          </div>

          {/* Calendar */}
          <Calendar
            value={activeValue}
            selectedDate={activeDate}
            onChange={activeOnChange}
            mode={mode}
            min={minForActive}
            max={maxForActive}
            rangeStart={draftStartDate}
            rangeEnd={draftEndDate}
            activeSide={activeSide}
            onSideSwitch={() => setActiveSide((s) => (s === 'start' ? 'end' : 'start'))}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => {
            setDraftStart('');
            setDraftEnd('');
          }}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            hasSelection
              ? 'text-muted-fg hover:bg-muted hover:text-fg'
              : 'pointer-events-none text-muted-fg opacity-50',
          )}
        >
          Clear
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-muted-fg transition-colors hover:bg-muted hover:text-fg"
        >
          Close
        </button>
        <button
          type="button"
          onClick={() => onApply(draftStart, draftEnd)}
          className={cn(
            'rounded-lg px-5 py-2 text-sm font-medium',
            'transition-all duration-150 active:scale-[0.98]',
            isDirty || hasSelection
              ? 'bg-primary text-primary-fg shadow-xs hover:opacity-90'
              : 'bg-muted text-muted-fg',
          )}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
