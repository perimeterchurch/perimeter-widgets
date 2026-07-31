/**
 * Pins an ACCEPTED accessibility exception so a well-meant "fix" has to come
 * here and read why first. See perimeterchurch/perimeter-widgets#192.
 *
 * The "See Details" button is white on the brand accent in light mode, which
 * measures 2.15:1 — below the 4.5:1 AA threshold. `@perimeter/theme` pairs
 * `primary` with `primary-fg` (brand navy, 7.32:1) precisely to avoid that, so
 * this widget overrides the pairing on purpose.
 *
 * It is not a widget bug: perimeter.org's own primary buttons are white on the
 * same `#60bbe9` at the same 2.15:1, on four homepage buttons. The widget is
 * matching a site-wide pattern, and the site owners chose the colour match over
 * the ratio with their stakeholders informed. Correcting the widget alone would
 * make it stop matching the site — the opposite of the stated priority.
 *
 * So: if you are here because an audit flagged the contrast, the fix belongs in
 * perimeter.org's buttons (and then `@perimeter/theme`), not in this file. #192
 * carries both measured options.
 *
 * Dark mode is deliberately NOT white — it keeps navy at 7.32:1, where nothing
 * on the page expects white.
 */
import { describe, it, expect } from 'vitest';
import cardSource from '../src/components/GroupCard.tsx?raw';

describe('See Details button — accepted contrast exception (#192)', () => {
  it('keeps the white label in light mode and navy in dark', () => {
    // Matched together: `text-white` alone, or a dark override to something
    // other than the theme's navy, would both be a change of decision.
    expect(cardSource).toContain('text-white dark:text-primary-fg');
  });

  it('does not carry a variant override that would abandon the accent', () => {
    // #186 proposed `variant="secondary"` (navy at 15.7:1) and was closed
    // unmerged: it passes AA but is not the button the site uses.
    expect(cardSource).not.toMatch(/variant=["']secondary["']/);
  });

  it('keeps the square corners and shadowless shape the design calls for', () => {
    expect(cardSource).toContain('rounded-none');
  });
});
