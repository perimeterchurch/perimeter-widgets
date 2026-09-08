import { describe, it, expect } from 'vitest';
import {
  partitionTrips,
  participantsMailto,
  sortDonations,
  sortParticipants,
  tripLabel,
} from '../../src/lib/trips';
import { donation, participant, trip, pastTrip } from '../fixtures';

describe('partitionTrips', () => {
  it('splits on the server-provided past flag', () => {
    const { current, past } = partitionTrips([trip(), pastTrip()]);
    expect(current.map((t) => t.pledgeId)).toEqual([8801]);
    expect(past.map((t) => t.pledgeId)).toEqual([8700]);
  });

  it('orders current trips soonest-first', () => {
    const { current } = partitionTrips([
      trip({ pledgeId: 2, startDate: '2026-09-01' }),
      trip({ pledgeId: 1, startDate: '2026-06-12' }),
    ]);
    expect(current.map((t) => t.pledgeId)).toEqual([1, 2]);
  });

  it('orders past trips most-recently-ended first', () => {
    const { past } = partitionTrips([
      pastTrip({ pledgeId: 1, endDate: '2023-05-01' }),
      pastTrip({ pledgeId: 2, endDate: '2025-05-01' }),
    ]);
    expect(past.map((t) => t.pledgeId)).toEqual([2, 1]);
  });

  it('sorts dateless trips last in either direction', () => {
    // MP allows a campaign with no travel dates set; such a trip should not
    // lead the list just because its date parses as epoch 0.
    const { current } = partitionTrips([
      trip({ pledgeId: 1, startDate: null }),
      trip({ pledgeId: 2, startDate: '2026-06-12' }),
    ]);
    expect(current.map((t) => t.pledgeId)).toEqual([2, 1]);

    const { past } = partitionTrips([
      pastTrip({ pledgeId: 3, endDate: null }),
      pastTrip({ pledgeId: 4, endDate: '2024-03-12' }),
    ]);
    expect(past.map((t) => t.pledgeId)).toEqual([4, 3]);
  });

  it('does not mutate the input array', () => {
    const trips = [trip({ pledgeId: 2, startDate: '2026-09-01' }), trip({ pledgeId: 1 })];
    partitionTrips(trips);
    expect(trips.map((t) => t.pledgeId)).toEqual([2, 1]);
  });
});

describe('sortDonations', () => {
  it('returns a new array, newest gift first', () => {
    const donations = [donation({ date: '2026-01-05' }), donation({ date: '2026-03-20' })];
    expect(sortDonations(donations).map((d) => d.date)).toEqual(['2026-03-20', '2026-01-05']);
    expect(donations.map((d) => d.date)).toEqual(['2026-01-05', '2026-03-20']);
  });
});

describe('sortParticipants', () => {
  it('sorts by surname', () => {
    const sorted = sortParticipants([
      participant({ pledgeId: 1, name: 'Tobias Achebe' }),
      participant({ pledgeId: 2, name: 'Nadia Oyelaran' }),
      participant({ pledgeId: 3, name: 'Ada Bell' }),
    ]);
    expect(sorted.map((p) => p.name)).toEqual(['Tobias Achebe', 'Ada Bell', 'Nadia Oyelaran']);
  });

  it('falls back to the full name when surnames tie', () => {
    const sorted = sortParticipants([
      participant({ pledgeId: 1, name: 'Zoe Bell' }),
      participant({ pledgeId: 2, name: 'Ada Bell' }),
    ]);
    expect(sorted.map((p) => p.name)).toEqual(['Ada Bell', 'Zoe Bell']);
  });
});

describe('tripLabel', () => {
  it('is just the trip name for the viewer’s own pledge', () => {
    expect(tripLabel(trip({ mine: true }))).toBe('Kenya Medical Journey');
  });

  it('names the participant for a household member’s pledge', () => {
    // Two household members on one campaign are two pledges; without this the
    // accordion showed two identical rows.
    expect(tripLabel(trip({ mine: false, participantName: 'Ruth Weathers' }))).toBe(
      'Kenya Medical Journey — Ruth Weathers',
    );
  });
});

describe('participantsMailto', () => {
  it('addresses the leader and BCCs everyone else', () => {
    const href = participantsMailto('leader@perimeter.org', [
      participant({ pledgeId: 1, email: 'a@example.com' }),
      participant({ pledgeId: 2, email: 'b@example.com' }),
    ]);
    expect(href).toBe('mailto:leader@perimeter.org?bcc=a%40example.com%2Cb%40example.com');
  });

  it('never BCCs the leader and drops duplicates and blanks', () => {
    const href = participantsMailto('leader@perimeter.org', [
      participant({ pledgeId: 1, email: 'leader@perimeter.org' }),
      participant({ pledgeId: 2, email: 'a@example.com' }),
      participant({ pledgeId: 3, email: ' a@example.com ' }),
      participant({ pledgeId: 4, email: null }),
    ]);
    expect(href).toBe('mailto:leader@perimeter.org?bcc=a%40example.com');
  });

  it('omits the bcc parameter entirely when there is no one to copy', () => {
    expect(participantsMailto('leader@perimeter.org', [])).toBe('mailto:leader@perimeter.org');
  });

  it('tolerates a missing leader email', () => {
    expect(participantsMailto(null, [participant({ email: 'a@example.com' })])).toBe(
      'mailto:?bcc=a%40example.com',
    );
  });
});
