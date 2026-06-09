import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import type { ContainerBreakpoint } from '../../lib/breakpoint';

interface Props {
  breakpoint: ContainerBreakpoint;
  activeFilterCount: number;
  hasActive: boolean;
  onClear: () => void;
  children: ReactNode;
}

/**
 * On phone, collapses its children (the filter dropdowns + date range) behind a
 * Filters toggle with an active-count badge + a Clear affordance, so the result
 * list is visible without scrolling past every control. On tablet/desktop the
 * children render inline with no toggle (always expanded).
 */
export function CollapsibleFilters({
  breakpoint,
  activeFilterCount,
  hasActive,
  onClear,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  if (breakpoint !== 'phone') return <>{children}</>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
        <div className="flex-1" />
        {hasActive && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
      {open && (
        <div id={bodyId} className="space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
