import { DateTime } from 'luxon';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatMoney(amount: number): string {
  return usd.format(amount);
}

/** `$0.00` reads as a price; the native widget says "Free". */
export function formatPrice(amount: number): string {
  return amount === 0 ? 'Free' : formatMoney(amount);
}

/**
 * MP stores event times naive-local in the congregation's zone. Interpreting
 * the string *in that zone* and formatting it there means a viewer in another
 * time zone sees the wall-clock time the event actually starts at, labelled
 * with the zone so it isn't mistaken for theirs.
 */
export function parseEventDate(naive: string, zone: string): DateTime {
  return DateTime.fromISO(naive, { zone });
}

/** "Sun, Sep 27, 2026, 6:00 PM – 8:00 PM EDT" or, across days, both dates. */
export function formatEventRange(start: string, end: string, zone: string): string {
  const s = parseEventDate(start, zone);
  const e = parseEventDate(end, zone);
  if (!s.isValid) return start;
  const day = s.toFormat('ccc, LLL d, yyyy');
  const time = (d: DateTime) => d.toFormat('h:mm a');
  if (!e.isValid) return `${day}, ${time(s)} ${s.toFormat('ZZZZ')}`;
  if (s.hasSame(e, 'day')) {
    return `${day}, ${time(s)} – ${time(e)} ${e.toFormat('ZZZZ')}`;
  }
  return `${day}, ${time(s)} – ${e.toFormat('ccc, LLL d, yyyy, h:mm a ZZZZ')}`;
}

/** "Registration closes Thu, Sep 24 at 11:59 PM EDT". */
export function formatDeadline(naive: string, zone: string): string {
  const d = parseEventDate(naive, zone);
  return d.isValid ? d.toFormat("ccc, LLL d 'at' h:mm a ZZZZ") : naive;
}

/** "age 9" / "age 2" / "" when unknown. */
export function formatAge(age: number | null): string {
  if (age === null) return '';
  return `age ${age}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
