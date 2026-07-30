import * as React from 'react';
import type { CommunityGroupFacetOption } from '@perimeter/api-hooks';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { Input } from '@perimeter/ui/input';
import { MultiCombobox, type MultiComboboxOption } from '@perimeter/ui/multi-combobox';
import { cn } from '@perimeter/ui/utils/cn';
import {
  MEETING_DAYS,
  MEETING_TIME_BUCKETS,
  activeFilterCount,
  hasActiveFilters,
  toggleValue,
  type FilterState,
} from '../lib/filters';

/**
 * `MultiCombobox` renders a `w-fit rounded-lg` trigger inside its root, which
 * suits the sermons filter row but not this panel's full-width square fields.
 * The child selectors reach past the root to square and stretch the trigger and
 * the popover; `className` alone only lands on the root.
 *
 * The placeholder override is a legibility fix, not cosmetics: the component
 * ships `placeholder:text-muted-fg`, but here the placeholder is the field's
 * *current state* ("All Cities" = not filtered), not a hint, and muted-fg lands
 * near 7:1 on the dark surface — fine on paper, hard to read in practice.
 */
const SELECT_OVERRIDES = cn(
  'w-full',
  '[&>div:first-of-type]:w-full [&>div:first-of-type]:rounded-none',
  '[&>ul]:rounded-none [&>ul]:border [&>ul]:border-border',
  '[&_input::placeholder]:text-fg',
);

const FIELD = 'border border-border bg-bg p-3';
// text-fg, not text-muted-fg: at 12px the muted token is legible by the numbers
// and not in the eye, especially on the dark surface.
const FIELD_LABEL = 'mb-1.5 block font-sans text-xs font-medium text-fg';

/** A labelled bordered block — the panel's one field shape. */
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn(FIELD, className)}>
      <span className={FIELD_LABEL}>{label}</span>
      {children}
    </div>
  );
}

/**
 * A checkbox with its label. Native `<input type="checkbox">` rather than a
 * custom control so it stays keyboard- and screen-reader-correct inside the
 * shadow root; `accent-primary` tints it with the brand blue.
 */
function CheckboxOption({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}): React.JSX.Element {
  return (
    <label
      htmlFor={id}
      className="inline-flex cursor-pointer items-center gap-2 font-sans text-sm text-fg select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 shrink-0 cursor-pointer accent-primary"
      />
      {label}
    </label>
  );
}

function toOptions(facets: CommunityGroupFacetOption[]): MultiComboboxOption[] {
  return facets.map((facet) => ({ value: String(facet.id), label: facet.name }));
}

export interface GroupFiltersProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onClear: () => void;
  showSearch: boolean;
  /** Hidden when the host page locks the widget to a city. */
  showNeighborhood: boolean;
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  neighborhoods: CommunityGroupFacetOption[];
  focuses: CommunityGroupFacetOption[];
  lifeStages: CommunityGroupFacetOption[];
  facetsLoading: boolean;
}

type OpenDropdown = 'neighborhood' | 'focus' | 'lifeStage';

export function GroupFilters(props: GroupFiltersProps): React.JSX.Element {
  // Only one dropdown open at a time, matching the sermons filter row.
  const [openDropdown, setOpenDropdown] = React.useState<OpenDropdown | null>(null);

  const { filters, onChange } = props;
  const patch = (next: Partial<FilterState>) => onChange({ ...filters, ...next });

  const activeCount = activeFilterCount(filters);
  const canClear = hasActiveFilters(filters);

  return (
    <div className="mb-4 flex flex-col gap-3">
      {props.showSearch && (
        <div className="flex flex-col gap-2 @md:flex-row @md:items-center">
          <Input
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Search community groups"
            aria-label="Search community groups"
            className="h-10 rounded-none"
          />
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="md"
              className="h-10 rounded-none"
              aria-expanded={props.advancedOpen}
              onClick={() => props.onAdvancedOpenChange(!props.advancedOpen)}
            >
              {props.advancedOpen ? 'Hide Filters' : 'Show Filters'}
              {!props.advancedOpen && activeCount > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-none">
                  {activeCount}
                </Badge>
              )}
            </Button>
            {canClear && (
              <Button
                variant="ghost"
                size="md"
                className="h-10 rounded-none"
                onClick={props.onClear}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {/* With no search box the toggle needs its own row, right-aligned like the
          MP widget it replaces. */}
      {!props.showSearch && (
        <div className="flex items-center justify-end gap-2">
          {canClear && (
            <Button variant="ghost" size="md" className="h-10 rounded-none" onClick={props.onClear}>
              Clear All
            </Button>
          )}
          <Button
            variant="outline"
            size="md"
            className="h-10 rounded-none"
            aria-expanded={props.advancedOpen}
            onClick={() => props.onAdvancedOpenChange(!props.advancedOpen)}
          >
            {props.advancedOpen ? 'Hide Advanced' : 'Show Advanced'}
            {!props.advancedOpen && activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 rounded-none">
                {activeCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {props.advancedOpen && (
        <div className="flex flex-col gap-2">
          {/* Labelled "City" for readers; the values are MP's City_Ministries,
              which is also what the endpoint calls `neighborhoodIds`. */}
          {props.showNeighborhood && (
            <Field label="City">
              <MultiCombobox
                multiple
                options={toOptions(props.neighborhoods)}
                value={filters.neighborhoodIds.map(String)}
                onValueChange={(v) => patch({ neighborhoodIds: v.map(Number) })}
                placeholder="All Cities"
                selectedLabel="Cities"
                disabled={props.facetsLoading}
                className={SELECT_OVERRIDES}
                isOpen={openDropdown === 'neighborhood'}
                onOpenChange={(open) => setOpenDropdown(open ? 'neighborhood' : null)}
              />
            </Field>
          )}

          <Field label="Group Focus">
            <MultiCombobox
              multiple
              options={toOptions(props.focuses)}
              value={filters.focusIds.map(String)}
              onValueChange={(v) => patch({ focusIds: v.map(Number) })}
              placeholder="All Group Focuses"
              selectedLabel="Group Focuses"
              disabled={props.facetsLoading}
              className={SELECT_OVERRIDES}
              isOpen={openDropdown === 'focus'}
              onOpenChange={(open) => setOpenDropdown(open ? 'focus' : null)}
            />
          </Field>

          {/* Labelled "Ages"; the values are MP's Life_Stages ("20s - 30s"). */}
          <Field label="Ages">
            <MultiCombobox
              multiple
              options={toOptions(props.lifeStages)}
              value={filters.lifeStageIds.map(String)}
              onValueChange={(v) => patch({ lifeStageIds: v.map(Number) })}
              placeholder="All Ages"
              selectedLabel="Ages"
              disabled={props.facetsLoading}
              className={SELECT_OVERRIDES}
              isOpen={openDropdown === 'lifeStage'}
              onOpenChange={(open) => setOpenDropdown(open ? 'lifeStage' : null)}
            />
          </Field>

          <Field label="Meeting Days">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {MEETING_DAYS.map((day) => (
                <CheckboxOption
                  key={day.id}
                  id={`cgf-day-${day.id}`}
                  label={day.short}
                  checked={filters.meetingDayIds.includes(day.id)}
                  onChange={() =>
                    patch({ meetingDayIds: toggleValue(filters.meetingDayIds, day.id) })
                  }
                />
              ))}
            </div>
          </Field>

          <Field label="Meeting Times">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {MEETING_TIME_BUCKETS.map((bucket) => (
                <CheckboxOption
                  key={bucket.id}
                  id={`cgf-time-${bucket.id}`}
                  label={bucket.label}
                  checked={filters.meetingTimes.includes(bucket.id)}
                  onChange={() =>
                    patch({ meetingTimes: toggleValue(filters.meetingTimes, bucket.id) })
                  }
                />
              ))}
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}
