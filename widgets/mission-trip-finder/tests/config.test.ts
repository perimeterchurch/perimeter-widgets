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
      showTeam: true,
    });
  });

  it('leaves detailsUrlBase unset so a card opens the detail in place', () => {
    // Changed in 0.2.0. It used to default to the go-journey-details page, so
    // every embed linked out; leaving it unset is what routes a click into the
    // widget's own detail view. Setting it restores the hand-off.
    expect(MissionTripFinderConfigSchema.parse({}).detailsUrlBase).toBeUndefined();
  });

  it('defaults the CTA templates to the legacy destinations', () => {
    const config = MissionTripFinderConfigSchema.parse({});
    expect(config.registerUrl).toContain('mission-trip-application/?pledgecampaignid={id}');
    // The giving form needs its `#!/` fragment AFTER the campaign ID, which is
    // why these are templates rather than base URLs.
    expect(config.supportUrl).toBe(
      'https://perimeter.onlinegiving.org/donate/form/1385?mp_campaign_id={id}#!/',
    );
  });

  it('leaves participantUrl unset — the legacy href was never wired up', () => {
    expect(MissionTripFinderConfigSchema.parse({}).participantUrl).toBeUndefined();
  });

  it('carries the legacy donation disclaimer by default', () => {
    expect(MissionTripFinderConfigSchema.parse({}).disclaimerText).toContain(
      'Donations are tax-deductible',
    );
  });

  it('coerces tripId, which pins the embed to a single trip', () => {
    expect(MissionTripFinderConfigSchema.parse({ tripId: '958' }).tripId).toBe(958);
    expect(MissionTripFinderConfigSchema.parse({}).tripId).toBeUndefined();
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

describe('widget definition', () => {
  it('renders as rectangles — Perimeter has no corner radius', async () => {
    const { default: widget } = await import('../src/widget');
    expect(widget.themeOverrides).toEqual({
      'radius-sm': '0px',
      'radius-md': '0px',
      'radius-lg': '0px',
    });
  });
});
