import type { MyMissionTrip, MyMissionDonation, MyMissionParticipant } from '@perimeter/api-hooks';

/**
 * Sample trips shaped like `GET /api/missions/my-trips`.
 *
 * Also the reference for what the endpoint has to return — it does not exist
 * yet (see the note in `packages/api-hooks/src/missions/use-my-mission-trips.ts`).
 */

export function donation(overrides: Partial<MyMissionDonation> = {}): MyMissionDonation {
  return {
    date: '2026-02-14',
    amount: 250,
    anonymous: false,
    donorName: 'Marta Whitfield',
    email: 'marta@example.com',
    phone: '770-555-0143',
    address: {
      line1: '118 Ridgemont Way',
      line2: null,
      city: 'Duluth',
      state: 'GA',
      postalCode: '30097',
    },
    ...overrides,
  };
}

export function participant(overrides: Partial<MyMissionParticipant> = {}): MyMissionParticipant {
  return {
    pledgeId: 9001,
    name: 'Nadia Oyelaran',
    email: 'nadia@example.com',
    totalPledge: 3200,
    totalDonations: 2400,
    ...overrides,
  };
}

export function trip(overrides: Partial<MyMissionTrip> = {}): MyMissionTrip {
  return {
    pledgeId: 8801,
    campaignId: 4410,
    name: 'Kenya Medical Journey',
    longDescription: '<p>Two weeks supporting the clinic in Kisumu.</p>',
    startDate: '2026-06-12',
    endDate: '2026-06-26',
    past: false,
    mine: true,
    participantName: 'Joseph Weathers',
    pledgeStatus: 'Active',
    totalPledge: 4000,
    totalDonations: 1500,
    lastDonationDate: '2026-02-14',
    letter: '<p>Thank you for partnering with me.</p>',
    isLeader: false,
    leaders: [{ name: 'Priya Raghunathan', email: 'priya@perimeter.org', pledgeId: 9101 }],
    donations: [donation()],
    leaderSummary: null,
    participants: [],
    ...overrides,
  };
}

/** A trip the viewer leads, with a roster and whole-trip totals. */
export function leaderTrip(overrides: Partial<MyMissionTrip> = {}): MyMissionTrip {
  return trip({
    pledgeId: 8802,
    campaignId: 4411,
    name: 'Guatemala Build',
    isLeader: true,
    leaderSummary: {
      email: 'joseph@perimeter.org',
      totalDonations: 12_400,
      totalGoal: 20_000,
    },
    participants: [
      participant(),
      participant({
        pledgeId: 9002,
        name: 'Tobias Achebe',
        email: 'tobias@example.com',
        totalPledge: 3200,
        totalDonations: 800,
      }),
    ],
    ...overrides,
  });
}

/** A finished trip: no letter, no leaders. */
export function pastTrip(overrides: Partial<MyMissionTrip> = {}): MyMissionTrip {
  return trip({
    pledgeId: 8700,
    campaignId: 4300,
    name: 'Peru: 3/2/2024 - 3/12/2024',
    startDate: '2024-03-02',
    endDate: '2024-03-12',
    past: true,
    letter: null,
    leaders: [],
    totalPledge: 3000,
    totalDonations: 3000,
    ...overrides,
  });
}
