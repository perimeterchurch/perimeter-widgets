/**
 * Two events run at the same time when their windows intersect. Dates are
 * MP naive-local ISO strings in the congregation zone, so string order is
 * time order. Mirrors perimeter-api's `eventsOverlap`.
 */
export function eventsOverlap(
  a: { eventId: number; startDate: string; endDate: string },
  b: { eventId: number; startDate: string; endDate: string },
): boolean {
  if (a.eventId === b.eventId) return false;
  return a.startDate < b.endDate && b.startDate < a.endDate;
}
