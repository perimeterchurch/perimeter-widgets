import * as React from 'react';
import { Button } from '@perimeter/ui/button';
import { Label } from '@perimeter/ui/label';
import {
  EMPTY_FILTERS,
  hasActiveFilter,
  type GivingFilterOptions,
  type GivingFilterState,
} from '../lib/giving';

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps): React.JSX.Element {
  const id = React.useId();
  return (
    <div className="flex min-w-36 flex-1 flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-fg">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-border bg-bg px-2 text-sm text-fg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface GivingFiltersProps {
  options: GivingFilterOptions;
  filters: GivingFilterState;
  onChange: (filters: GivingFilterState) => void;
}

export function GivingFilters({
  options,
  filters,
  onChange,
}: GivingFiltersProps): React.JSX.Element {
  return (
    <section className="flex flex-wrap items-end gap-3" aria-label="Filters">
      <FilterSelect
        label="Year"
        value={filters.year}
        options={options.years}
        onChange={(year) => onChange({ ...filters, year })}
      />
      <FilterSelect
        label="Donor"
        value={filters.donor}
        options={options.donors}
        onChange={(donor) => onChange({ ...filters, donor })}
      />
      <FilterSelect
        label="Payment type"
        value={filters.paymentType}
        options={options.paymentTypes}
        onChange={(paymentType) => onChange({ ...filters, paymentType })}
      />
      <FilterSelect
        label="Program"
        value={filters.program}
        options={options.programs}
        onChange={(program) => onChange({ ...filters, program })}
      />
      {hasActiveFilter(filters) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
          Clear filters
        </Button>
      )}
    </section>
  );
}
