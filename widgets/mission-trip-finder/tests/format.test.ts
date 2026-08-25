import { describe, it, expect } from 'vitest';
import {
  fillUrlTemplate,
  formatCost,
  formatTripDates,
  participantPhotoUrl,
  spotsRemaining,
} from '../src/lib/format';

describe('formatTripDates', () => {
  it('prints the year once when both ends share it', () => {
    expect(formatTripDates('2026-07-08T06:46:00', '2026-07-17T06:47:00')).toBe(
      'July 8 – July 17, 2026',
    );
  });

  it('prints both years when the trip straddles New Year', () => {
    expect(formatTripDates('2026-12-28T00:00:00', '2027-01-05T00:00:00')).toBe(
      'December 28, 2026 – January 5, 2027',
    );
  });

  it('collapses a single-day trip to one date', () => {
    expect(formatTripDates('2026-07-08T06:46:00', '2026-07-08T20:00:00')).toBe('July 8, 2026');
  });

  it('falls back to the start date when the end is missing', () => {
    expect(formatTripDates('2026-07-08T06:46:00', null)).toBe('July 8, 2026');
  });

  it('returns null when the trip has no start date', () => {
    expect(formatTripDates(null, '2026-07-17T00:00:00')).toBeNull();
  });

  it('returns null for an unparseable date', () => {
    expect(formatTripDates('not a date', null)).toBeNull();
  });

  it('reads MP wall-clock dates without timezone shifting', () => {
    // A midnight start must stay on its own calendar day regardless of the
    // viewer's zone — `new Date(iso)` would slide this to the 7th west of UTC.
    expect(formatTripDates('2026-07-08T00:00:00', null)).toBe('July 8, 2026');
  });
});

describe('formatCost', () => {
  it('formats whole dollars with a thousands separator', () => {
    expect(formatCost(3500)).toBe('$3,500');
  });

  it('drops cents', () => {
    expect(formatCost(2400.5)).toBe('$2,401');
  });

  it('handles a zero goal', () => {
    expect(formatCost(0)).toBe('$0');
  });
});

describe('spotsRemaining', () => {
  it('returns the difference for a capped trip', () => {
    expect(spotsRemaining(8, 11)).toBe(3);
  });

  it('returns null for an uncapped trip', () => {
    expect(spotsRemaining(8, null)).toBeNull();
  });

  it('floors at zero when a trip is over its cap', () => {
    expect(spotsRemaining(28, 27)).toBe(0);
  });
});

describe('fillUrlTemplate', () => {
  it('substitutes the trip ID', () => {
    expect(fillUrlTemplate('https://example.org/apply?pledgecampaignid={id}', { id: 948 })).toBe(
      'https://example.org/apply?pledgecampaignid=948',
    );
  });

  it('keeps anything after the placeholder', () => {
    // The whole reason these are templates: the giving form needs its `#!/`
    // fragment AFTER the campaign ID, which appending to a base URL cannot do.
    expect(
      fillUrlTemplate(
        'https://perimeter.onlinegiving.org/donate/form/1385?mp_campaign_id={id}#!/',
        {
          id: 948,
        },
      ),
    ).toBe('https://perimeter.onlinegiving.org/donate/form/1385?mp_campaign_id=948#!/');
  });

  it('substitutes the pledge ID for participant links', () => {
    expect(
      fillUrlTemplate('https://example.org/p?trip={id}&pledge={pledgeId}', {
        id: 948,
        pledgeId: 99928,
      }),
    ).toBe('https://example.org/p?trip=948&pledge=99928');
  });

  it('replaces every occurrence of a placeholder', () => {
    expect(fillUrlTemplate('{id}/{id}', { id: 5 })).toBe('5/5');
  });
});

describe('participantPhotoUrl', () => {
  it('nests the pledge under the trip so the API can verify membership', () => {
    expect(participantPhotoUrl(958, 99928, 'https://api.example.org')).toBe(
      'https://api.example.org/api/mission-trips/958/participant/99928/image',
    );
  });

  it('tolerates a trailing slash on the configured base URL', () => {
    expect(participantPhotoUrl(958, 99928, 'https://api.example.org/')).toBe(
      'https://api.example.org/api/mission-trips/958/participant/99928/image',
    );
  });
});
