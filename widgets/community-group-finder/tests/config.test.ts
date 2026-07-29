import { describe, it, expect } from 'vitest';
import { CommunityGroupFinderConfigSchema } from '../src/types';

describe('CommunityGroupFinderConfigSchema', () => {
  it('defaults to the filtered, badged, image-and-description view', () => {
    expect(CommunityGroupFinderConfigSchema.parse({})).toMatchObject({
      showImages: true,
      showDescription: true,
      showFilters: true,
      showSearch: true,
      advancedOpen: false,
      hideFull: false,
      groupTypeId: 13,
      detailsUrlBase: 'https://www.perimeter.org/group-details/?id=',
      detailsLabel: 'See Details',
    });
  });

  it('keeps apiUrl, which the mount reads to pick the API base URL', () => {
    // Regression guard: the mount resolves the API client's base URL from
    // `config.apiUrl`, so dropping this field from the schema silently strips
    // `data-api-url` and every embed falls back to production.
    const config = CommunityGroupFinderConfigSchema.parse({ apiUrl: 'http://localhost:5500' });
    expect(config.apiUrl).toBe('http://localhost:5500');
  });

  it('coerces data-* attribute strings into booleans and numbers', () => {
    const config = CommunityGroupFinderConfigSchema.parse({
      showImages: '',
      hideFull: 'true',
      advancedOpen: 'true',
      groupTypeId: '10',
      descriptionLimit: '120',
      maxGroups: '6',
    });
    expect(config.showImages).toBe(false);
    expect(config.hideFull).toBe(true);
    expect(config.advancedOpen).toBe(true);
    expect(config.groupTypeId).toBe(10);
    expect(config.descriptionLimit).toBe(120);
    expect(config.maxGroups).toBe(6);
  });

  it('keeps neighborhoodIds as a raw string — the app parses the comma list', () => {
    expect(CommunityGroupFinderConfigSchema.parse({ neighborhoodIds: '5,1' })).toMatchObject({
      neighborhoodIds: '5,1',
    });
  });
});
