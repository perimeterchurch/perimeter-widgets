import { describe, it, expect } from 'vitest';
import { MissionTripFinderConfigSchema } from '../src/types';

describe('MissionTripFinderConfigSchema', () => {
  it('defaults to the open, badged, cost-and-description view', () => {
    expect(MissionTripFinderConfigSchema.parse({})).toMatchObject({
      showDescription: true,
      showCost: true,
      showSpots: false,
      hideFull: false,
      includePast: false,
      detailsUrlBase: 'https://www.perimeter.org/global-outreach/go-journey-details/?id=',
    });
  });

  it('keeps apiUrl, which the mount reads to pick the API base URL', () => {
    // Regression guard: the mount resolves the API client's base URL from
    // `config.apiUrl`, so dropping this field from the schema silently strips
    // `data-api-url` and every embed falls back to production.
    const config = MissionTripFinderConfigSchema.parse({ apiUrl: 'http://localhost:5500' });
    expect(config.apiUrl).toBe('http://localhost:5500');
  });

  it('coerces data-* attribute strings into booleans and numbers', () => {
    const config = MissionTripFinderConfigSchema.parse({
      showDescription: '',
      hideFull: 'true',
      destinationId: '7',
      maxTrips: '6',
    });
    expect(config.showDescription).toBe(false);
    expect(config.hideFull).toBe(true);
    expect(config.destinationId).toBe(7);
    expect(config.maxTrips).toBe(6);
  });
});
