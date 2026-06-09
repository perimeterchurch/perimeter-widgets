import { Eye } from 'lucide-react';
import { SortSelect } from '@perimeter/ui/sort-select';
import { IconSelect } from '@perimeter/ui/icon-select';
import type { ReactNode } from 'react';
import type { ContainerBreakpoint } from '../../lib/breakpoint';

interface SortFieldOption {
  value: string;
  label: string;
  icon: ReactNode;
}

interface ViewOption {
  value: string;
  label: string;
  icon: ReactNode;
}

interface ResultsToolbarProps {
  /** Total result count, or null while loading (the line is still reserved). */
  count: number | null;
  /** Plural noun for the resource, e.g. "sermons" or "series". */
  noun: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  sortFields: SortFieldOption[];
  onSortFieldChange: (field: string) => void;
  onSortDirectionChange: (direction: 'asc' | 'desc') => void;
  viewMode: string;
  viewOptions: ViewOption[];
  onViewModeChange: (mode: string) => void;
  /** Container breakpoint; on `phone` the Sort/View dropdowns render compactly (icon + value, no prefix). */
  breakpoint: ContainerBreakpoint;
}

/**
 * Shared results header: count on the left, sort + view controls on the right.
 * The two views (sermons/series) differ only in their sort fields, view
 * options, noun, and handlers — all passed in — so the layout itself is shared.
 *
 * The row uses `flex-wrap` with `gap-y` so the sort/view controls drop below
 * the count at narrow container widths instead of overflowing. The count line
 * is always rendered (a non-breaking space placeholder while loading) so the
 * row keeps its height and doesn't reflow when results arrive.
 */
export function ResultsToolbar({
  count,
  noun,
  sortField,
  sortDirection,
  sortFields,
  onSortFieldChange,
  onSortDirectionChange,
  viewMode,
  viewOptions,
  onViewModeChange,
  breakpoint,
}: ResultsToolbarProps) {
  const compact = breakpoint === 'phone';
  return (
    <div
      data-slot="results-toolbar"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
    >
      <span data-slot="results-count" className="text-sm text-muted-fg">
        {count != null ? `${count} ${noun}` : ' '}
      </span>
      <div className="flex items-center gap-2">
        <SortSelect
          compact={compact}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortFieldChange={onSortFieldChange}
          onSortDirectionChange={onSortDirectionChange}
          fields={sortFields}
        />
        <IconSelect
          compact={compact}
          value={viewMode}
          onChange={onViewModeChange}
          options={viewOptions}
          label="View:"
          icon={<Eye className="h-3.5 w-3.5 shrink-0" />}
        />
      </div>
    </div>
  );
}
