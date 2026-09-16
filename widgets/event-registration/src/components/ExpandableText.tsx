import * as React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface ExpandableTextProps {
  /** Plain-text one-liner shown while collapsed. Nothing renders when empty. */
  summary: string;
  /** The full content (usually `RichText`) shown when expanded. */
  children: React.ReactNode;
  /** Lines the summary may take before it is clipped. */
  lines?: 1 | 2 | 3;
  label?: string;
  /** Desktop shows the full content without a toggle; the summary and toggle are phone/tablet only. */
  desktopAlwaysOpen?: boolean;
  className?: string;
}

const CLAMP = { 1: 'line-clamp-1', 2: 'line-clamp-2', 3: 'line-clamp-3' } as const;

/**
 * The Great Wolf "+ View Details" pattern: a clipped one-liner with a text
 * button that swaps in the full copy. The toggle is a real button (44px tall,
 * `aria-expanded`) whose name never starts with "Add", so a card still has
 * exactly one "Add…" button for the tests and for screen-reader users.
 */
export function ExpandableText({
  summary,
  children,
  lines = 1,
  label = 'View details',
  desktopAlwaysOpen = false,
  className = '',
}: ExpandableTextProps): React.JSX.Element | null {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  if (summary.trim().length === 0) return null;

  const phoneOnly = desktopAlwaysOpen ? '@min-[768px]:hidden' : '';

  return (
    <div className={`grid gap-1 ${className}`}>
      {open ? (
        <div id={id}>{children}</div>
      ) : (
        <>
          <p className={`${CLAMP[lines]} font-sans text-sm text-muted-fg ${phoneOnly}`}>
            {summary}
          </p>
          {desktopAlwaysOpen && <div className="hidden @min-[768px]:block">{children}</div>}
        </>
      )}
      <div className={phoneOnly}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={() => setOpen((o) => !o)}
          className="-my-2 inline-flex min-h-11 items-center gap-1 font-sans text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          {open ? (
            <Minus aria-hidden className="size-4" />
          ) : (
            <Plus aria-hidden className="size-4" />
          )}
          {open ? 'Hide details' : label}
        </button>
      </div>
    </div>
  );
}
