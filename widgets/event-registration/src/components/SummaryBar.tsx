import * as React from 'react';
import { ChevronDown, ShoppingBag } from 'lucide-react';
import { Spinner } from '@perimeter/ui/spinner';
import { formatMoney, pluralize } from '../lib/format';

export interface SummaryBarProps {
  /** Registrants added so far. */
  count: number;
  /** The quote's invoice total; null until a quote exists. */
  total: number | null;
  quoting: boolean;
  showPrices: boolean;
  /** Quote problems; the bar opens itself the first time any appear. */
  problemCount: number;
  open: boolean;
  onToggle: () => void;
  /** Pixels of fixed host header to sit below. */
  topOffset: number;
  /** The review body, shown when expanded. */
  children: React.ReactNode;
}

/**
 * The phone/tablet "Stay Summary" bar: sticky at the top of the widget, one
 * line collapsed (count + total), the full review when expanded. Never
 * renders the word "Total" in the collapsed row so an all-free event shows no
 * money anywhere.
 */
export function SummaryBar({
  count,
  total,
  quoting,
  showPrices,
  problemCount,
  open,
  onToggle,
  topOffset,
  children,
}: SummaryBarProps): React.JSX.Element {
  // Open once when problems first appear; the visitor may collapse it again.
  const seenProblems = React.useRef(false);
  const openRef = React.useRef(open);
  openRef.current = open;
  const toggleRef = React.useRef(onToggle);
  toggleRef.current = onToggle;
  React.useEffect(() => {
    if (problemCount > 0 && !seenProblems.current) {
      seenProblems.current = true;
      if (!openRef.current) toggleRef.current();
    }
    if (problemCount === 0) seenProblems.current = false;
  }, [problemCount]);

  return (
    <div
      data-slot="summary-bar"
      className="sticky z-20 -mx-4 border-b border-border bg-bg shadow-sm"
      style={{ top: topOffset }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="registration-summary-panel"
        onClick={onToggle}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left font-sans text-sm text-fg hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden focus-visible:ring-inset"
      >
        <span className="flex items-center gap-3">
          <span className="relative grid size-8 shrink-0 place-items-center">
            <ShoppingBag aria-hidden className="size-5" />
            {count > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 grid size-4 place-items-center bg-secondary font-sans text-2xs font-bold text-secondary-fg"
              >
                {count}
              </span>
            )}
          </span>
          <span className="grid">
            <span className="font-bold">Your registration</span>
            <span className="text-xs text-muted-fg">
              {count === 0 ? 'Nothing added yet' : `${pluralize(count, 'person', 'people')} added`}
              {problemCount > 0 && (
                <span className="text-destructive"> · {pluralize(problemCount, 'issue')}</span>
              )}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {showPrices && count > 0 && (
            <span className="font-sans text-base font-bold text-fg">
              {quoting && total === null ? <Spinner /> : formatMoney(total ?? 0)}
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={`size-5 shrink-0 transition-transform motion-reduce:transition-none ${
              open ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>
      {open && (
        <div
          id="registration-summary-panel"
          className="max-h-[60vh] overflow-y-auto border-t border-border px-4 py-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
