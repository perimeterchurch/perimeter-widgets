import * as React from 'react';
import type { StaffDirectoryFacetOption } from '@perimeter/api-hooks';
import { Input } from '@perimeter/ui/input';
import { MultiCombobox, type MultiComboboxOption } from '@perimeter/ui/multi-combobox';
import { cn } from '@perimeter/ui/utils/cn';

/**
 * `MultiCombobox` renders a `w-fit rounded-lg` trigger inside its root, which
 * suits the sermons filter row but not this row's square, stretched field. The
 * child selectors reach past the root to square and widen the trigger and the
 * popover; `className` alone only lands on the root. Same overrides the
 * community-group-finder's panel uses.
 *
 * The placeholder override is a legibility fix: the placeholder here is the
 * field's *current state* ("All Departments" = not filtered), not a hint, so it
 * gets full-contrast `text-fg` rather than the component's muted default.
 */
const SELECT_OVERRIDES = cn(
  'w-full',
  '[&>div:first-of-type]:w-full [&>div:first-of-type]:rounded-none',
  '[&>ul]:rounded-none [&>ul]:border [&>ul]:border-border',
  '[&_input::placeholder]:text-fg',
);

function toOptions(facets: readonly StaffDirectoryFacetOption[]): MultiComboboxOption[] {
  return facets.map((facet) => ({ value: String(facet.id), label: facet.name }));
}

export interface StaffFiltersProps {
  search: string;
  onSearchChange: (next: string) => void;
  ministryIds: number[];
  onMinistryIdsChange: (next: number[]) => void;
  showSearch: boolean;
  /** Hidden when the host page locks the widget to specific ministries. */
  showMinistryFilter: boolean;
  ministries: readonly StaffDirectoryFacetOption[];
  facetsLoading: boolean;
}

/**
 * The search box and ministry dropdown, in the legacy widget's proportions —
 * search takes two thirds, the dropdown one, and they stack on a narrow
 * container.
 */
export function StaffFilters(props: StaffFiltersProps): React.JSX.Element | null {
  if (!props.showSearch && !props.showMinistryFilter) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 @lg:flex-row">
      {props.showSearch && (
        <div className="@lg:flex-2">
          <Input
            type="search"
            value={props.search}
            onChange={(event) => props.onSearchChange(event.currentTarget.value)}
            placeholder="Search by name, title, or department…"
            aria-label="Search staff"
            className="w-full rounded-none"
          />
        </div>
      )}
      {props.showMinistryFilter && (
        <div className="@lg:flex-1">
          <MultiCombobox
            multiple
            options={toOptions(props.ministries)}
            value={props.ministryIds.map(String)}
            onValueChange={(values) => props.onMinistryIdsChange(values.map(Number))}
            placeholder="All Departments"
            selectedLabel="Departments"
            disabled={props.facetsLoading}
            className={SELECT_OVERRIDES}
          />
        </div>
      )}
    </div>
  );
}
