/** The four meeting-time buckets the API derives from `Groups.Meeting_Time`. */
export const MEETING_TIME_BUCKETS = [
  { id: 'morning', label: 'Morning' },
  { id: 'lunchtime', label: 'Lunchtime' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
] as const;

/**
 * MP `Meeting_Days` IDs 1–7 with the two-letter labels the finder's day row
 * uses. ID 8 ("Varying Day") is deliberately absent — it is not a weekday and
 * has no place in a Su–Sa strip; groups with a varying day are reachable
 * through every other filter.
 */
export const MEETING_DAYS = [
  { id: 1, short: 'Su', label: 'Sunday' },
  { id: 2, short: 'Mo', label: 'Monday' },
  { id: 3, short: 'Tu', label: 'Tuesday' },
  { id: 4, short: 'We', label: 'Wednesday' },
  { id: 5, short: 'Th', label: 'Thursday' },
  { id: 6, short: 'Fr', label: 'Friday' },
  { id: 7, short: 'Sa', label: 'Saturday' },
] as const;

export interface FilterState {
  search: string;
  location: string;
  neighborhoodIds: number[];
  focusIds: number[];
  lifeStageIds: number[];
  meetingDayIds: number[];
  meetingTimes: string[];
}

export const EMPTY_FILTERS: FilterState = {
  search: '',
  location: '',
  neighborhoodIds: [],
  focusIds: [],
  lifeStageIds: [],
  meetingDayIds: [],
  meetingTimes: [],
};

/**
 * How many filters are currently narrowing the results. Counted per filter
 * rather than per selected value, so "Sunday + Monday" is one active filter —
 * that is what the collapsed panel's badge is telling the reader.
 */
export function activeFilterCount(filters: FilterState): number {
  return [
    filters.location.trim().length > 0,
    filters.neighborhoodIds.length > 0,
    filters.focusIds.length > 0,
    filters.lifeStageIds.length > 0,
    filters.meetingDayIds.length > 0,
    filters.meetingTimes.length > 0,
  ].filter(Boolean).length;
}

/** True when anything at all is narrowing the results, search included. */
export function hasActiveFilters(filters: FilterState): boolean {
  return activeFilterCount(filters) > 0 || filters.search.trim().length > 0;
}

/**
 * Add or remove one value from a list — the toggle every checkbox and
 * multi-select in the panel shares.
 */
export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Turn filter state into `/api/community-groups` query parameters. Empty
 * filters are omitted entirely rather than sent blank: the endpoint treats an
 * absent parameter as "not filtered", and an empty string would still parse as
 * a present-but-unusable filter.
 */
export function toQueryParams(filters: FilterState): Record<string, string> {
  const params: Record<string, string> = {};

  const search = filters.search.trim();
  if (search) params.keyword = search;

  const location = filters.location.trim();
  if (location) params.location = location;

  if (filters.neighborhoodIds.length > 0) {
    params.neighborhoodIds = filters.neighborhoodIds.join(',');
  }
  if (filters.focusIds.length > 0) params.focusIds = filters.focusIds.join(',');
  if (filters.lifeStageIds.length > 0) {
    params.lifeStageIds = filters.lifeStageIds.join(',');
  }
  if (filters.meetingDayIds.length > 0) {
    params.meetingDayIds = filters.meetingDayIds.join(',');
  }
  if (filters.meetingTimes.length > 0) {
    params.meetingTimes = filters.meetingTimes.join(',');
  }

  return params;
}

/**
 * Parse a `data-neighborhood-ids` config value into ids. Used to lock the
 * widget to one neighborhood on a per-neighborhood page, which also hides the
 * Neighborhood filter.
 */
export function parseIdList(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}
