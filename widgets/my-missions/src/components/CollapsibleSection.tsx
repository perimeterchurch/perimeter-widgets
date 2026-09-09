import * as React from 'react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  /** Optional count/status pill rendered next to the title. */
  meta?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * One disclosure inside an expanded trip (Description, Donations, My Letter,
 * Trip Leader Resources). Collapsed by default, as in the legacy widget.
 *
 * The body is only mounted while open. The legacy version animated
 * `max-height` and left the collapsed content in the DOM, which meant a
 * screen reader read the whole trip's tables even when everything looked
 * closed; unmounting keeps the accessibility tree honest and costs nothing
 * here — no section holds state worth preserving across a collapse.
 */
export function CollapsibleSection({
  title,
  meta,
  children,
}: CollapsibleSectionProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const bodyId = React.useId();

  return (
    <section className="overflow-hidden rounded-md border border-border">
      <h5>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 bg-muted px-4 py-3 text-left text-base font-semibold text-fg transition-colors hover:bg-accent hover:text-accent-fg focus-visible:bg-accent focus-visible:text-accent-fg focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{title}</span>
            {meta}
          </span>
          <ChevronDown
            aria-hidden
            className={`size-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </h5>
      {open && (
        <div id={bodyId} className="p-4">
          {children}
        </div>
      )}
    </section>
  );
}
