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

/** -1 Pre-K, 0 K, 1..12 — the scale the API uses for grades. */
export const GRADE_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
].map((value) => ({ value, label: formatGrade(value) }));

export function formatGrade(grade: number): string {
  if (grade <= -1) return 'Pre-K';
  if (grade === 0) return 'K';
  const suffix =
    grade % 10 === 1 && grade !== 11
      ? 'st'
      : grade % 10 === 2 && grade !== 12
        ? 'nd'
        : grade % 10 === 3 && grade !== 13
          ? 'rd'
          : 'th';
  return `${grade}${suffix}`;
}

/**
 * True when nothing on the page can cost anything: every section is free,
 * offers no deposit, and every option is $0. Then "Free" badges and $0.00
 * amounts are noise and the widget hides all money.
 */
export function eventIsFree(event: {
  sections: ReadonlyArray<{
    product: {
      basePrice: number;
      depositPrice: number | null;
      groups: ReadonlyArray<{ prices: ReadonlyArray<{ price: number }> }>;
    } | null;
  }>;
}): boolean {
  return event.sections.every(
    (s) =>
      s.product === null ||
      (s.product.basePrice === 0 &&
        s.product.depositPrice === null &&
        s.product.groups.every((g) => g.prices.every((p) => p.price === 0))),
  );
}

/**
 * "$10" + "00" for the card footer's large price with superscript cents.
 * Negative and fractional amounts round the way `formatMoney` does.
 */
export function formatMoneyParts(amount: number): { whole: string; cents: string } {
  const [whole, cents = '00'] = formatMoney(amount).split('.');
  return { whole: whole ?? '$0', cents };
}

/**
 * Staff HTML collapsed to one line of plain text for a card summary. Parsing
 * with DOMParser is inert (no scripts run, nothing is attached to the page);
 * the full markup is still rendered through DOMPurify when expanded.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  if (typeof DOMParser === 'undefined')
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
