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
      fullBleed: true,
      showTestimonials: true,
    });
  });

  it('defaults to linking out, so releasing never changes a live embed', () => {
    // Release safety: an embed that sets nothing must behave exactly as it did
    // before the detail view existed. Flipping this default would silently
    // change every live page the moment a new version reaches the manifest.
    const config = MissionTripFinderConfigSchema.parse({});
    expect(config.detailsMode).toBe('link');
    expect(config.detailsUrlBase).toBe(
      'https://www.perimeter.org/global-outreach/go-journey-details/?id=',
    );
  });

  it('opts into the in-place detail view explicitly', () => {
    expect(MissionTripFinderConfigSchema.parse({ detailsMode: 'inline' }).detailsMode).toBe(
      'inline',
    );
  });

  it('rejects an unknown details mode rather than guessing', () => {
    expect(() => MissionTripFinderConfigSchema.parse({ detailsMode: 'popup' })).toThrow();
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

describe('gallery config', () => {
  it('leaves galleryUrls unset — MP has no per-trip gallery to default to', () => {
    expect(MissionTripFinderConfigSchema.parse({}).galleryUrls).toBeUndefined();
  });

  it('accepts a comma-separated list from a data-* attribute', () => {
    const config = MissionTripFinderConfigSchema.parse({
      galleryUrls: 'https://a.example/1.jpg, https://a.example/2.jpg',
    });
    expect(config.galleryUrls).toBe('https://a.example/1.jpg, https://a.example/2.jpg');
  });
});
