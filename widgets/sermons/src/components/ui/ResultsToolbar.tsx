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
 * Shared results header: the sort + view controls, right-aligned. The two views
 * (sermons/series) differ only in their sort fields, view options and handlers
 * — all passed in — so the layout itself is shared. There is no result count;
 * the perimeter.org design leaves it out.
 */
export function ResultsToolbar({
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
    <div data-slot="results-toolbar" className="flex items-center justify-end gap-2">
      <SortSelect
        compact={compact}
        variant="ghost"
        sortField={sortField}
        sortDirection={sortDirection}
        onSortFieldChange={onSortFieldChange}
        onSortDirectionChange={onSortDirectionChange}
        fields={sortFields}
      />
      <IconSelect
        compact={compact}
        variant="ghost"
        value={viewMode}
        onChange={onViewModeChange}
        options={viewOptions}
        label="View:"
        icon={<Eye className="h-3.5 w-3.5 shrink-0" />}
      />
    </div>
  );
}
