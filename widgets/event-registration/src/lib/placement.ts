import type { DateTime } from 'luxon';
import type { RegistrationOptionGroup, RegistrationOptionPrice } from '@perimeter/api-hooks';

/**
 * Client-side mirror of perimeter-api's room placement (placement.ts there):
 * a group whose options point at rooms with `Placement_*` bounds is decided
 * from the child's birth date / grade on event day, and hidden when it
 * resolves. The server re-derives on every quote and submit and is the
 * authority; this copy only decides what to show before the round trip.
 */

export type PlacementAskReason =
  'needs_birth_date' | 'needs_grade' | 'no_match' | 'ambiguous' | 'unavailable';

export type PlacementOutcome =
  | { kind: 'not_placement' }
  | { kind: 'resolved'; price: RegistrationOptionPrice }
  | { kind: 'ask'; reason: PlacementAskReason };

export interface PlacementPerson {
  dateOfBirth: string | null;
  grade: number | null;
}

type Rule = NonNullable<RegistrationOptionPrice['placement']>;

const hasAgeBound = (r: Rule) => r.minAgeMonths !== null || r.maxAgeMonths !== null;
const hasGradeBound = (r: Rule) => r.minGrade !== null || r.maxGrade !== null;

export function isPlacementGroup(group: RegistrationOptionGroup): boolean {
  return group.prices.some((p) => p.placement !== null);
}

/** Whole months between a `yyyy-MM-dd` birth date and the event start; null when unknown or future. */
export function ageInMonthsOn(dateOfBirth: string | null, eventStart: DateTime): number | null {
  if (!dateOfBirth) return null;
  const dob = eventStart.set({
    year: Number(dateOfBirth.slice(0, 4)),
    month: Number(dateOfBirth.slice(5, 7)),
    day: Number(dateOfBirth.slice(8, 10)),
  });
  if (!dob.isValid) return null;
  const months = Math.floor(eventStart.startOf('day').diff(dob.startOf('day'), 'months').months);
  return months >= 0 ? months : null;
}

export function resolvePlacement(
  group: RegistrationOptionGroup,
  person: PlacementPerson,
  eventStart: DateTime,
): PlacementOutcome {
  const ruled = group.prices.filter(
    (p): p is RegistrationOptionPrice & { placement: Rule } => p.placement !== null,
  );
  if (ruled.length === 0) return { kind: 'not_placement' };

  const ageMonths = ageInMonthsOn(person.dateOfBirth, eventStart);
  if (ageMonths === null && ruled.some((p) => hasAgeBound(p.placement)))
    return { kind: 'ask', reason: 'needs_birth_date' };
  const byAge = ruled.filter((p) => {
    if (ageMonths === null) return true;
    const r = p.placement;
    if (r.minAgeMonths !== null && ageMonths < r.minAgeMonths) return false;
    if (r.maxAgeMonths !== null && ageMonths >= r.maxAgeMonths) return false;
    return true;
  });

  if (person.grade === null && byAge.some((p) => hasGradeBound(p.placement)))
    return { kind: 'ask', reason: 'needs_grade' };
  const byGrade = byAge.filter((p) => {
    if (person.grade === null) return true;
    const r = p.placement;
    if (r.minGrade !== null && person.grade < r.minGrade) return false;
    if (r.maxGrade !== null && person.grade > r.maxGrade) return false;
    return true;
  });
  const gradeSpecific = byGrade.filter((p) => hasGradeBound(p.placement));
  const candidates = person.grade !== null && gradeSpecific.length > 0 ? gradeSpecific : byGrade;

  if (candidates.length === 0) return { kind: 'ask', reason: 'no_match' };
  if (candidates.length > 1) return { kind: 'ask', reason: 'ambiguous' };
  const price = candidates[0]!;
  const available =
    !price.hidden && !price.isPromo && (price.remaining === null || price.remaining > 0);
  return available ? { kind: 'resolved', price } : { kind: 'ask', reason: 'unavailable' };
}

export function placementHint(reason: PlacementAskReason, name: string): string | null {
  switch (reason) {
    case 'no_match':
      return `None of these fit ${name}'s age — please choose the closest.`;
    case 'ambiguous':
      return `More than one could fit ${name} — please choose.`;
    case 'unavailable':
      return `The one that fits ${name} is full — please choose another.`;
    default:
      return null;
  }
}
