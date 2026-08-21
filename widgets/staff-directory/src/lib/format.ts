import type { StaffDirectoryMember, StaffDirectoryPosition } from '@perimeter/api-hooks';

/**
 * The titles shown on a card, joined with a middle dot.
 *
 * A person can hold several positions and the API returns them longest-held
 * first, so the primary role reads first. The API already collapses duplicate
 * title+ministry pairs, which MP genuinely contains.
 */
export function formatPositionTitles(positions: readonly StaffDirectoryPosition[]): string {
  return positions.map((position) => position.title).join(' · ');
}

/**
 * The ministries a person sits in, deduped and joined. Two positions in the
 * same ministry contribute one name — the legacy widget's hardcoded "High
 * School (SHM) Middle School (JHM)" special case, now derived.
 */
export function formatMinistries(positions: readonly StaffDirectoryPosition[]): string {
  const seen: string[] = [];
  for (const position of positions) {
    if (position.ministry && !seen.includes(position.ministry)) seen.push(position.ministry);
  }
  return seen.join(' · ');
}

/**
 * Where a card links. Returns null when the person has no Contact GUID, since
 * the contact form has nothing to look them up by — the card then renders
 * unlinked rather than pointing at a page that would 404.
 */
export function contactUrl(member: StaffDirectoryMember, targetUrl: string): string | null {
  if (!member.contactGuid) return null;
  return `${targetUrl}${encodeURIComponent(member.contactGuid)}`;
}

/**
 * Up to two initials for the placeholder tile. Built from the rendered display
 * name so it matches what the card shows, and falls back to a single glyph
 * rather than an empty tile.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = [words[0], words.length > 1 ? words[words.length - 1] : undefined]
    .filter((word): word is string => word !== undefined)
    .map((word) => word[0]?.toUpperCase() ?? '');
  return letters.join('') || '?';
}

/**
 * Tailwind column classes for the configured card count, at the container
 * breakpoints the legacy widget's media queries used (4 → 3 → 2 → 1). Written
 * out rather than interpolated because Tailwind only emits classes it can see
 * in the source.
 */
export function gridColumnsClass(columns: number): string {
  switch (columns) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-1 @sm:grid-cols-2';
    case 3:
      return 'grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-3';
    case 5:
      return 'grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-5';
    case 6:
      return 'grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-6';
    case 4:
    default:
      return 'grid-cols-1 @sm:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-4';
  }
}
