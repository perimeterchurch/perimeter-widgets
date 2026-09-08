import type { MyMissionTrip, MyMissionDonation, MyMissionParticipant } from '@perimeter/api-hooks';
import { parseTripDate } from './format';

/**
 * Split the flat trip list into the two sections the widget renders.
 *
 * The server marks each trip `past`; this only groups and orders. Current trips
 * run soonest-first (the trip you are about to take is the one you care about),
 * past trips most-recent-first — matching the legacy stored procedure's
 * `ORDER BY PC.Trip_End_Date DESC`.
 */
export function partitionTrips(trips: readonly MyMissionTrip[]): {
  current: MyMissionTrip[];
  past: MyMissionTrip[];
} {
  const current = trips
    .filter((trip) => !trip.past)
    .sort((a, b) => parseTripDate(a.startDate).getTime() - parseTripDate(b.startDate).getTime());

  const past = trips
    .filter((trip) => trip.past)
    .sort((a, b) => parseTripDate(b.endDate).getTime() - parseTripDate(a.endDate).getTime());

  return { current, past };
}

/** Donations newest-first, without mutating the query cache's array. */
export function sortDonations(donations: readonly MyMissionDonation[]): MyMissionDonation[] {
  return [...donations].sort(
    (a, b) => parseTripDate(b.date).getTime() - parseTripDate(a.date).getTime(),
  );
}

/** Participants by last word of the name, then the whole name. */
export function sortParticipants(
  participants: readonly MyMissionParticipant[],
): MyMissionParticipant[] {
  const surname = (name: string): string => name.trim().split(/\s+/).at(-1) ?? name;
  return [...participants].sort(
    (a, b) => surname(a.name).localeCompare(surname(b.name)) || a.name.localeCompare(b.name),
  );
}

/**
 * The accordion label for a trip.
 *
 * Two members of one household can hold separate pledges on the same campaign,
 * which the legacy widget rendered as two identically-titled rows with no way
 * to tell them apart. A pledge that is not the viewer's own is tagged with
 * whose it is.
 */
export function tripLabel(trip: MyMissionTrip): string {
  return trip.mine ? trip.name : `${trip.name} — ${trip.participantName}`;
}

/**
 * The `mailto:` a trip leader's "Email All Participants" opens: addressed to
 * the leader with everyone else BCC'd, so participants don't see each other's
 * addresses. Drops blanks, de-duplicates, and never BCCs the leader.
 */
export function participantsMailto(
  leaderEmail: string | null,
  participants: readonly MyMissionParticipant[],
): string {
  const leader = leaderEmail?.trim() ?? '';
  const bcc = [
    ...new Set(
      participants
        .map((participant) => participant.email?.trim() ?? '')
        .filter((email) => email !== '' && email !== leader),
    ),
  ];
  const query = bcc.length > 0 ? `?bcc=${encodeURIComponent(bcc.join(','))}` : '';
  return `mailto:${leader}${query}`;
}
