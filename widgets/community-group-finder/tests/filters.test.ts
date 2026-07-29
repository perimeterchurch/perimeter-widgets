import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTERS,
  MEETING_DAYS,
  MEETING_TIME_BUCKETS,
  activeFilterCount,
  hasActiveFilters,
  parseIdList,
  toQueryParams,
  toggleValue,
  type FilterState,
} from '../src/lib/filters';

function filters(over: Partial<FilterState> = {}): FilterState {
  return { ...EMPTY_FILTERS, ...over };
}

describe('MEETING_DAYS', () => {
  it('covers Sunday through Saturday with MP ids 1–7', () => {
    expect(MEETING_DAYS.map((d) => d.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(MEETING_DAYS.map((d) => d.short)).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
  });

  it('omits MP id 8 ("Varying Day"), which is not a weekday', () => {
    // Widened to number[] deliberately: `as const` narrows the ids to 1–7, so
    // comparing against 8 directly is a type error rather than a runtime check.
    const ids: number[] = MEETING_DAYS.map((d) => d.id);
    expect(ids).not.toContain(8);
  });
});

describe('MEETING_TIME_BUCKETS', () => {
  it('matches the four buckets the API derives', () => {
    expect(MEETING_TIME_BUCKETS.map((b) => b.id)).toEqual([
      'morning',
      'lunchtime',
      'afternoon',
      'evening',
    ]);
  });
});

describe('toggleValue', () => {
  it('adds a value that is absent', () => {
    expect(toggleValue([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it('removes a value that is present', () => {
    expect(toggleValue([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('does not mutate the input', () => {
    const list = [1, 2];
    toggleValue(list, 3);
    expect(list).toEqual([1, 2]);
  });
});

describe('activeFilterCount', () => {
  it('is zero for empty filters', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('counts per filter, not per selected value', () => {
    expect(activeFilterCount(filters({ meetingDayIds: [1, 2, 3] }))).toBe(1);
  });

  it('sums distinct filters', () => {
    expect(activeFilterCount(filters({ meetingDayIds: [1], meetingTimes: ['evening'] }))).toBe(2);
  });

  it('ignores the search box — search is not one of the panel filters', () => {
    expect(activeFilterCount(filters({ search: 'hiking' }))).toBe(0);
  });

  it('ignores a whitespace-only location', () => {
    expect(activeFilterCount(filters({ location: '   ' }))).toBe(0);
  });
});

describe('hasActiveFilters', () => {
  it('is false for empty filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it('counts search, unlike activeFilterCount', () => {
    expect(hasActiveFilters(filters({ search: 'hiking' }))).toBe(true);
  });

  it('counts a panel filter', () => {
    expect(hasActiveFilters(filters({ focusIds: [7] }))).toBe(true);
  });
});

describe('toQueryParams', () => {
  it('returns nothing for empty filters', () => {
    expect(toQueryParams(EMPTY_FILTERS)).toEqual({});
  });

  it('maps search to keyword and joins id lists with commas', () => {
    expect(
      toQueryParams(
        filters({
          search: 'hiking',
          location: '30005',
          neighborhoodIds: [5, 1],
          focusIds: [7],
          lifeStageIds: [4, 8],
          meetingDayIds: [1, 4],
          meetingTimes: ['evening', 'morning'],
        }),
      ),
    ).toEqual({
      keyword: 'hiking',
      location: '30005',
      neighborhoodIds: '5,1',
      focusIds: '7',
      lifeStageIds: '4,8',
      meetingDayIds: '1,4',
      meetingTimes: 'evening,morning',
    });
  });

  it('trims search and location', () => {
    expect(toQueryParams(filters({ search: '  hiking  ', location: ' 30005 ' }))).toEqual({
      keyword: 'hiking',
      location: '30005',
    });
  });

  it('omits whitespace-only text rather than sending a blank filter', () => {
    // The endpoint treats an absent parameter as "not filtered"; a blank string
    // would still arrive as a present-but-unusable filter.
    expect(toQueryParams(filters({ search: '   ', location: '  ' }))).toEqual({});
  });
});

describe('parseIdList', () => {
  it('parses a comma list', () => {
    expect(parseIdList('5,1, 9')).toEqual([5, 1, 9]);
  });

  it('drops non-numeric and non-positive entries', () => {
    expect(parseIdList('5,abc,-1,0,9')).toEqual([5, 9]);
  });

  it('returns an empty list for undefined and empty input', () => {
    expect(parseIdList(undefined)).toEqual([]);
    expect(parseIdList('')).toEqual([]);
    expect(parseIdList('abc')).toEqual([]);
  });
});
