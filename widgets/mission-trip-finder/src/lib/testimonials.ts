/**
 * Placeholder testimonials for the detail view's "Hear From Others" band.
 *
 * HARDCODED ON PURPOSE, and temporary. Ministry Platform has nowhere to put
 * these today — there is no testimonial or story table, and nothing on
 * `Pledge_Campaigns` holds free text per person. Joseph asked for them
 * hardcoded so the section can be reviewed while a real source is decided.
 *
 * The names and quotes are the Figma's own placeholder copy, not real people,
 * which is also why each card renders an initials monogram rather than a photo:
 * there are no headshots to source, and inventing faces for invented quotes
 * would be worse than a monogram.
 *
 * When a real source arrives this file is the only thing that changes shape —
 * `Testimonials` already renders whatever this array holds.
 */
export interface Testimonial {
  quote: string;
  name: string;
}

export const TESTIMONIALS: readonly Testimonial[] = [
  {
    quote:
      'This trip taught me more about gratitude, humility, and joy than I could have ever learned at home. It was truly unforgettable.',
    name: 'Olivia Ramirez',
  },
  {
    quote:
      'Serving others opened my eyes to the beauty of different cultures and the power of compassion. I’ll never forget the people I met and the friendships I made.',
    name: 'Daniel Alvarez',
  },
  {
    quote:
      'Being part of this mission trip reminded me how big God’s family is. It was inspiring to serve together and see lives changed—including mine.',
    name: 'Hannah Lee',
  },
];

/** First letters of the first two words, e.g. "Olivia Ramirez" -> "OR". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
