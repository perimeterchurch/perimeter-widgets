import { useId, useRef, type KeyboardEvent } from 'react';

import { cn } from './utils/cn';

export interface SegmentedTabItem {
  /** Stable identifier — the value reported to `onChange` and matched against `value`. */
  id: string;
  /** Visible tab label. */
  label: React.ReactNode;
}

export interface SegmentedTabsProps {
  /** The ordered tabs. */
  items: SegmentedTabItem[];
  /** The currently-selected tab id (controlled). */
  value: string;
  /** Called with the newly-selected tab id. */
  onChange: (id: string) => void;
  /** Accessible label for the tablist. */
  'aria-label'?: string;
  /** Extra classes on the track. */
  className?: string;
}

/**
 * A controlled segmented control rendered as a WAI-ARIA tablist: a rounded
 * `bg-muted` track of `role="tab"` buttons, the active one lifted with
 * `bg-bg text-fg shadow-sm`. Roving `tabIndex` keeps a single tab stop, and
 * ArrowLeft/ArrowRight wrap-around focus + select the adjacent tab (the
 * WAI-ARIA automatic-activation pattern).
 *
 * Token-correct in light + dark: inactive labels dim via `text-fg/60`, the
 * `dark:` nudges key off the widget/studio `data-theme` (the shared preset
 * `dark` variant), not the visitor's OS preference. Controlled-only — both the
 * studio inspector and the sermons tab row drive selection from above.
 */
export function SegmentedTabs({
  items,
  value,
  onChange,
  'aria-label': ariaLabel,
  className,
}: SegmentedTabsProps) {
  const baseId = useId();
  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusAndSelect = (id: string) => {
    onChange(id);
    refs.current[id]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    // Wrap-around so the arrow keys cycle past either end.
    const next = items[(index + delta + items.length) % items.length];
    if (next) focusAndSelect(next.id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex w-full gap-1 rounded-lg bg-muted p-[3px]', className)}
    >
      {items.map(({ id, label }, index) => {
        const selected = value === id;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[id] = el;
            }}
            type="button"
            role="tab"
            id={tabId(id)}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              selected
                ? 'bg-bg text-fg shadow-sm'
                : 'text-fg/60 hover:text-fg dark:text-muted-fg dark:hover:text-fg',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
