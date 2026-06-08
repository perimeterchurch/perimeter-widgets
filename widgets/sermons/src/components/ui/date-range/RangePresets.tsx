/**
 * Quick-select preset column for the DateRangePicker popover.
 * Extracted verbatim from the former monolithic DateRangePicker so the split
 * is behavior-identical.
 */

import type { DurationLike } from 'luxon';
import { cn } from '@perimeter/ui/utils/cn';

export interface DateRangePreset {
  label: string;
  duration: DurationLike;
}

export function RangePresets({
  presets,
  onSelect,
}: {
  presets: DateRangePreset[];
  onSelect: (preset: DateRangePreset) => void;
}) {
  return (
    <div className="flex w-36 shrink-0 flex-col gap-1.5 border-r border-border pr-5">
      <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
        Quick select
      </span>
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onSelect(preset)}
          className={cn(
            'rounded-lg px-3 py-2 text-left text-xs font-medium',
            'transition-all duration-150',
            'text-muted-fg',
            'hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]',
            'active:scale-[0.97]',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
