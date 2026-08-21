import { describe, it, expect } from 'vitest';
import { StaffDirectoryConfigSchema } from '../src/types';

describe('StaffDirectoryConfigSchema', () => {
  it("defaults to the legacy widget's view — searchable, four columns, linked", () => {
    expect(StaffDirectoryConfigSchema.parse({})).toMatchObject({
      title: 'All Staff',
      intro: 'Search staff members by name, keyword, or department.',
      showSearch: true,
      showMinistryFilter: true,
      showPositions: true,
      showMinistryOnCard: false,
      columns: 4,
      linkCards: true,
      targetUrl: 'https://www.perimeter.org/staff-contact/?contactGuid=',
    });
  });

  it('keeps apiUrl, which the mount reads to pick the API base URL', () => {
    // Regression guard: the mount resolves the API client's base URL from
    // `config.apiUrl`, so dropping this field from the schema silently strips
    // `data-api-url` and every embed falls back to production.
    const config = StaffDirectoryConfigSchema.parse({ apiUrl: 'http://localhost:5500' });
    expect(config.apiUrl).toBe('http://localhost:5500');
  });

  it('coerces data-* attribute strings into booleans and numbers', () => {
    const config = StaffDirectoryConfigSchema.parse({
      showSearch: '',
      showMinistryFilter: '',
      showMinistryOnCard: 'true',
      linkCards: '',
      columns: '3',
      maxStaff: '12',
    });
    expect(config.showSearch).toBe(false);
    expect(config.showMinistryFilter).toBe(false);
    expect(config.showMinistryOnCard).toBe(true);
    expect(config.linkCards).toBe(false);
    expect(config.columns).toBe(3);
    expect(config.maxStaff).toBe(12);
  });

  it('clamps columns to a layout the grid actually has classes for', () => {
    // gridColumnsClass only emits classes for 1–6; Tailwind cannot generate an
    // interpolated one, so a wider value would silently render a single column.
    expect(() => StaffDirectoryConfigSchema.parse({ columns: '9' })).toThrow();
    expect(() => StaffDirectoryConfigSchema.parse({ columns: '0' })).toThrow();
  });

  it('leaves the id filters unset rather than empty', () => {
    const config = StaffDirectoryConfigSchema.parse({});
    expect(config.ministryIds).toBeUndefined();
    expect(config.personnelTypeIds).toBeUndefined();
    expect(config.contactIds).toBeUndefined();
  });
});
