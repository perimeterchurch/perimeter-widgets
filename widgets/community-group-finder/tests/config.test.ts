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
      showFullGroups: true,
      countGroupInquiries: false,
      showFutureGroups: true,
      groupTypeId: 13,
      targetUrl: 'https://www.perimeter.org/group-details/?id=',
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
      showFullGroups: '',
      countGroupInquiries: 'true',
      advancedOpen: 'true',
      groupTypeId: '10',
      descriptionLimit: '120',
      maxGroups: '6',
    });
    expect(config.showImages).toBe(false);
    expect(config.showFullGroups).toBe(false);
    expect(config.countGroupInquiries).toBe(true);
    expect(config.advancedOpen).toBe(true);
    expect(config.groupTypeId).toBe(10);
    expect(config.descriptionLimit).toBe(120);
    expect(config.maxGroups).toBe(6);
  });

  it('defaults the MP-parity flags the way MP documents them, except showFullGroups', () => {
    const config = CommunityGroupFinderConfigSchema.parse({});
    // MP defaults showfullgroups to false; Perimeter shows them badged instead.
    expect(config.showFullGroups).toBe(true);
    expect(config.countGroupInquiries).toBe(false);
    expect(config.showFutureGroups).toBe(true);
  });

  it('keeps neighborhoodIds as a raw string — the app parses the comma list', () => {
    expect(CommunityGroupFinderConfigSchema.parse({ neighborhoodIds: '5,1' })).toMatchObject({
      neighborhoodIds: '5,1',
    });
  });

  it('keeps ministryIds as a raw string too, and unset by default', () => {
    // Ministry_ID (Ministries) is a different column from City_Ministry_ID
    // (City_Ministries) behind neighborhoodIds — both are configurable, and the
    // names are close enough that a swap would be easy to miss.
    expect(CommunityGroupFinderConfigSchema.parse({ ministryIds: '113,50' })).toMatchObject({
      ministryIds: '113,50',
    });
    expect(CommunityGroupFinderConfigSchema.parse({}).ministryIds).toBeUndefined();
  });
});
