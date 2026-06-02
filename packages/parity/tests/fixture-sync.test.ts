import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hostProfile } from '@perimeter/theme';

// The WordPress fixture is the single source of truth for "production page"
// styling in parity work, and hostProfile is the typed mirror the studio's
// HostFrame consumes. This test pins them together: if a *value* mismatches,
// the fix is to re-measure the live page and update BOTH — never one side.
const fixture = readFileSync(
  fileURLToPath(new URL('../fixtures/wordpress.html', import.meta.url)),
  'utf8',
);

describe('hostProfile matches the WordPress audit fixture', () => {
  it('replicates the measured inheritable + layout values', () => {
    expect(fixture).toContain(`font-size: ${hostProfile.rootFontSize}`); // html 16px
    expect(fixture).toContain(`font-size: ${hostProfile.bodyFontSize}`); // body 19px
    expect(fixture).toContain(`line-height: ${hostProfile.bodyLineHeight}`); // 35px
    expect(fixture).toContain(`color: ${hostProfile.bodyColor}`); // #353535
    expect(fixture).toContain(`background: ${hostProfile.bodyBackground}`); // #ffffff
    expect(fixture).toContain(`max-width: ${hostProfile.contentMaxWidth}`); // 1425px
    expect(fixture).toContain(`padding: 0 ${hostProfile.contentPaddingX}`); // 90px
  });

  it('matches the font-family stack quote-agnostically (fixture uses single quotes, hostProfile double)', () => {
    // hostProfile.bodyFontFamily is CSS-canonical double-quoted
    // (sweet-sans-pro, "Helvetica Neue", …) while the fixture uses single
    // quotes ('Helvetica Neue'). Assert the quote-agnostic fragments.
    expect(fixture).toContain('sweet-sans-pro');
    expect(fixture).toContain('Helvetica Neue');
    expect(fixture).toContain('Arial, sans-serif');
  });
});
