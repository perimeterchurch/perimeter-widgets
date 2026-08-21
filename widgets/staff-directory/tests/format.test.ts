import { describe, it, expect } from 'vitest';
import type { StaffDirectoryMember, StaffDirectoryPosition } from '@perimeter/api-hooks';
import {
  contactUrl,
  formatMinistries,
  formatPositionTitles,
  gridColumnsClass,
  initials,
} from '../src/lib/format';

const position = (over: Partial<StaffDirectoryPosition> = {}): StaffDirectoryPosition => ({
  id: 1,
  title: 'Communications Studio Manager',
  ministry: 'Communications',
  ministryId: 32,
  isDepartmentHead: false,
  isDivisionHead: false,
  startDate: '2024-08-26T00:00:00',
  ...over,
});

const member = (over: Partial<StaffDirectoryMember> = {}): StaffDirectoryMember => ({
  personnelId: 5785,
  contactId: 814346,
  contactGuid: '3c4afc8f-8d44-478f-8269-807441aff768',
  name: 'Adriel Abella',
  firstName: 'Adriel',
  lastName: 'Abella',
  nickname: 'Adriel',
  photoUrl: null,
  personnelType: 'Part Time Not Exempt',
  personnelTypeId: 3,
  startDate: '2024-08-26T00:00:00',
  positions: [position()],
  ...over,
});

describe('formatPositionTitles', () => {
  it('returns a single title unchanged', () => {
    expect(formatPositionTitles([position()])).toBe('Communications Studio Manager');
  });

  it('joins several titles in the order the API returned them', () => {
    // Longest-held first, so the primary role reads first.
    expect(
      formatPositionTitles([
        position({ title: 'Executive Director of Leadership Development' }),
        position({ title: "Director of Men's Ministry" }),
      ]),
    ).toBe("Executive Director of Leadership Development · Director of Men's Ministry");
  });

  it('returns an empty string when there are no positions', () => {
    expect(formatPositionTitles([])).toBe('');
  });
});

describe('formatMinistries', () => {
  it('dedupes two positions in the same ministry', () => {
    expect(
      formatMinistries([
        position({ ministry: 'Perimeter Christian School', ministryId: 21 }),
        position({ ministry: 'Perimeter Christian School', ministryId: 21 }),
      ]),
    ).toBe('Perimeter Christian School');
  });

  it('joins genuinely different ministries', () => {
    // The legacy widget hardcoded "High School (SHM) Middle School (JHM)" for
    // exactly this person; it is now derived.
    expect(
      formatMinistries([
        position({ ministry: 'High School', ministryId: 14 }),
        position({ ministry: 'Middle School', ministryId: 15 }),
      ]),
    ).toBe('High School · Middle School');
  });

  it('skips a position with no ministry', () => {
    expect(formatMinistries([position({ ministry: null })])).toBe('');
  });
});

describe('contactUrl', () => {
  it('appends the Contact GUID to the target URL', () => {
    expect(contactUrl(member(), 'https://www.perimeter.org/staff-contact/?contactGuid=')).toBe(
      'https://www.perimeter.org/staff-contact/?contactGuid=3c4afc8f-8d44-478f-8269-807441aff768',
    );
  });

  it('returns null without a GUID, so the card renders unlinked', () => {
    expect(contactUrl(member({ contactGuid: null }), 'https://example.org/?g=')).toBeNull();
  });
});

describe('initials', () => {
  it('takes the first and last words', () => {
    expect(initials('Adriel Abella')).toBe('AA');
  });

  it('skips middle names', () => {
    expect(initials('Mary Anne Fitzgerald')).toBe('MF');
  });

  it('handles a single name', () => {
    expect(initials('Cher')).toBe('C');
  });

  it('falls back to a glyph rather than an empty tile', () => {
    expect(initials('')).toBe('?');
    expect(initials('   ')).toBe('?');
  });
});

describe('gridColumnsClass', () => {
  it.each([
    [1, 'grid-cols-1'],
    [2, '@sm:grid-cols-2'],
    [3, '@2xl:grid-cols-3'],
    [4, '@4xl:grid-cols-4'],
    [6, '@4xl:grid-cols-6'],
  ])('emits a %i-column class chain', (columns, expected) => {
    expect(gridColumnsClass(columns)).toContain(expected);
  });

  it('always starts at one column so a narrow embed never overflows', () => {
    for (const columns of [1, 2, 3, 4, 5, 6]) {
      expect(gridColumnsClass(columns)).toContain('grid-cols-1');
    }
  });
});
