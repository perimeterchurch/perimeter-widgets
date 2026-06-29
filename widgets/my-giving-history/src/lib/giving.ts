import type { GivingHistoryItem } from '@perimeter/api-hooks';
import { getYear } from './format';

export interface GivingFilterState {
  year: string;
  donor: string;
  paymentType: string;
  program: string;
}

export const EMPTY_FILTERS: GivingFilterState = {
  year: '',
  donor: '',
  paymentType: '',
  program: '',
};

export function hasActiveFilter(filters: GivingFilterState): boolean {
  return (
    filters.year !== '' ||
    filters.donor !== '' ||
    filters.paymentType !== '' ||
    filters.program !== ''
  );
}

/** Rows matching every set filter (an empty filter matches everything). */
export function filterItems(
  items: GivingHistoryItem[],
  filters: GivingFilterState,
): GivingHistoryItem[] {
  return items.filter(
    (item) =>
      (filters.year === '' || getYear(item.date) === filters.year) &&
      (filters.donor === '' || item.donorName === filters.donor) &&
      (filters.paymentType === '' || item.paymentType === filters.paymentType) &&
      (filters.program === '' || item.programName === filters.program),
  );
}

function distinctSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export interface GivingFilterOptions {
  years: string[];
  donors: string[];
  paymentTypes: string[];
  programs: string[];
}

/** Distinct option lists for each filter, drawn from the full data set. */
export function filterOptions(items: GivingHistoryItem[]): GivingFilterOptions {
  return {
    // Years newest-first; the rest alphabetical.
    years: [...new Set(items.map((i) => getYear(i.date)))].sort((a, b) => b.localeCompare(a)),
    donors: distinctSorted(items.map((i) => i.donorName)),
    paymentTypes: distinctSorted(items.map((i) => i.paymentType)),
    programs: distinctSorted(items.map((i) => i.programName)),
  };
}

export function totalAmount(items: GivingHistoryItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

export interface YearTotal {
  year: string;
  total: number;
}

/** Total given per year, oldest year first — the chart's data. */
export function totalsByYear(items: GivingHistoryItem[]): YearTotal[] {
  const byYear = new Map<string, number>();
  for (const item of items) {
    const year = getYear(item.date);
    byYear.set(year, (byYear.get(year) ?? 0) + item.amount);
  }
  return [...byYear.entries()]
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year.localeCompare(b.year));
}
