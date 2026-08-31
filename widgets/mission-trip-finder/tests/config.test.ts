import { describe, it, expect } from 'vitest';
import { MissionTripFinderConfigSchema } from '../src/types';

/**
 * WCAG relative luminance / contrast, over this repo's `hsl(H S% L%)` token
 * format. A trimmed copy of packages/theme/tests/contrast.test.ts's helpers —
 * that suite guards the shared palette, and this widget overrides two of its
 * colors, so the same arithmetic has to run against the overrides.
 */
function parseHsl(value: string): [number, number, number] {
  const m = value.match(/^hsl\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%\)$/);
  if (!m) throw new Error(`not a parseable hsl token: ${value}`);
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = l - c / 2;
  const seg = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][Math.floor(h / 60) % 6]!;
  return [(seg[0]! + m2) * 255, (seg[1]! + m2) * 255, (seg[2]! + m2) * 255];
}

function contrast(fg: [number, number, number], bg: [number, number, number]): number {
  const lum = (rgb: [number, number, number]) => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

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
      showGallery: false,
      showTestimonials: false,
      detailLayout: 'contained',
      headerOffset: 0,
    });
  });

  it('coerces the header offset from a data-* string', () => {
    expect(MissionTripFinderConfigSchema.parse({ headerOffset: '90' }).headerOffset).toBe(90);
  });

  it('rejects an unknown detail layout rather than guessing', () => {
    expect(() => MissionTripFinderConfigSchema.parse({ detailLayout: 'takeover' })).toThrow();
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
    expect(widget.themeOverrides).toMatchObject({
      'radius-sm': '0px',
      'radius-md': '0px',
      'radius-lg': '0px',
    });
  });

  // Global Outreach asked for white button labels knowing they fail WCAG AA on
  // the light `primary` blue (~2:1, against 7.3:1 for the default navy). Pinned
  // so the override cannot be lost silently in a refactor — and so the reason
  // it exists is written down next to it.
  it('overrides primary-fg to white for button labels, by ministry request', async () => {
    const { default: widget } = await import('../src/widget');
    expect(widget.themeOverrides?.['color-primary-fg']).toBe('hsl(0 0% 100%)');
  });

  // The override has to stay scoped to this widget: the shared palette keeps
  // the AA-compliant pairing that packages/theme guards for every other widget.
  it('does not touch the shared palette', async () => {
    const { globalTokens } = await import('@perimeter/theme');
    expect(globalTokens['color-primary-fg']).toBe('hsl(210 75% 14.1%)');
  });

  it('uses the ministry metadata grey for secondary text', async () => {
    const { default: widget } = await import('../src/widget');
    expect(widget.themeOverrides?.['color-muted-fg']).toBe('hsl(215 0.5% 43.28%)');
  });

  // Unlike the white button labels, this one is NOT a knowing AA exception —
  // it stays above the 4.5:1 floor on both surfaces the widget renders muted
  // text on. Pinned so a later "just nudge the grey" cannot quietly drop it
  // below, the way the 2026-06-10 axe sweep caught the shared token.
  it('keeps the metadata grey above WCAG AA on the surfaces it renders on', async () => {
    const { default: widget } = await import('../src/widget');
    const { globalTokens } = await import('@perimeter/theme');

    const fg = parseHsl(widget.themeOverrides!['color-muted-fg']!);
    expect(contrast(fg, parseHsl('hsl(0 0% 100%)'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(fg, parseHsl(globalTokens['color-muted']))).toBeGreaterThanOrEqual(4.5);
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
