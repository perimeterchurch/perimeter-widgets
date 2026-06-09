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
  /**
   * Optional base for the DOM ids assigned to each tab button. Pass this when a
   * consumer renders an associated `role="tabpanel"` and needs to point its
   * `aria-labelledby` at the active tab — derive the matching id with
   * {@link segmentedTabId} from the same base. Defaults to an internal `useId`
   * (sufficient when the tabs drive sibling views rather than a labelled panel).
   */
  idBase?: string;
  /**
   * The DOM id of the `role="tabpanel"` these tabs control. When set, every tab
   * gets `aria-controls={panelId}`, completing the WAI-ARIA tab↔panel
   * association (pair with the panel's `aria-labelledby`). Omit when the tabs
   * have no single associated panel (e.g. they switch sibling views).
   */
  panelId?: string;
  /** Extra classes on the track. */
  className?: string;
}

/**
 * The DOM id assigned to the tab button for `tabItemId` under `idBase`. Use this
 * to wire a tabpanel's `aria-labelledby` to the active tab, passing the same
 * `idBase` you gave {@link SegmentedTabs}.
 */
export function segmentedTabId(idBase: string, tabItemId: string): string {
  return `${idBase}-tab-${tabItemId}`;
}

/**
 * A controlled segmented control rendered as a WAI-ARIA tablist: a rounded
 * `bg-muted` track of `role="tab"` buttons, the active one lifted with
 * `bg-bg text-fg shadow-xs`. Roving `tabIndex` keeps a single tab stop, and the
 * keyboard follows the WAI-ARIA automatic-activation pattern: ArrowLeft/Right
 * wrap-around to the adjacent tab, Home/End jump to the first/last — each moving
 * focus + selection together.
 *
 * For tabs that control a single panel (the studio inspector), pass `panelId`
 * (→ `aria-controls` on every tab) and `idBase`, then point the panel's
 * `aria-labelledby` at {@link segmentedTabId}(idBase, value) to complete the
 * tab↔panel association. Omit both when the tabs switch sibling views (sermons).
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
  idBase,
  panelId,
  className,
}: SegmentedTabsProps) {
  const generatedId = useId();
  const baseId = idBase ?? generatedId;
  const tabId = (id: string) => segmentedTabId(baseId, id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusAndSelect = (id: string) => {
    onChange(id);
    refs.current[id]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    // WAI-ARIA tabs pattern: arrows move (with wrap), Home/End jump to the ends.
    let nextIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % items.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + items.length) % items.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const next = items[nextIndex];
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
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors',
              'focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              selected
                ? 'bg-bg text-fg shadow-xs'
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
