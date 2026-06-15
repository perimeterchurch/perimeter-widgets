import { describe, expect, it } from 'vitest';
import { inlinePropertyFallbacks } from '../src/css';

/**
 * Tailwind v4 registers its `--tw-*` variables with `@property` rules, which
 * browsers only process in DOCUMENT stylesheets — inside a shadow root's
 * constructable sheet they are inert, so every var()-dependent utility
 * (border-style, ring/shadow composites, transitions) collapses to nothing.
 * The studio masked this for months because its own page-level Tailwind CSS
 * registered the same properties globally; bare host pages (WordPress, the
 * embed lab) got widgets with no borders, rings, shadows, or hover styles.
 *
 * `inlinePropertyFallbacks` mirrors Tailwind's own no-@property fallback:
 * a universal rule carrying every registered initial value, prepended inside
 * `@layer properties` so it is the FIRST declared layer and loses to every
 * later layer (theme/base/components/utilities) — exactly the cascade
 * position Tailwind gives its guarded fallback.
 */
describe('inlinePropertyFallbacks', () => {
  it('emits a universal fallback rule for @property rules with initial values', () => {
    const css =
      '@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}' +
      '@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}' +
      '.border{border-style:var(--tw-border-style)}';
    const out = inlinePropertyFallbacks(css);

    expect(out).toContain('@layer properties{*,::before,::after,::backdrop{');
    expect(out).toContain('--tw-border-style:solid');
    expect(out).toContain('--tw-shadow:0 0 #0000');
    // The original rules (and the rest of the sheet) survive untouched.
    expect(out).toContain('.border{border-style:var(--tw-border-style)}');
    expect(out).toContain('@property --tw-border-style');
  });

  it('prepends the fallback so `properties` is the first declared layer', () => {
    const css =
      '@layer theme,base,components,utilities;' +
      '@property --tw-x{syntax:"*";inherits:false;initial-value:1}';
    const out = inlinePropertyFallbacks(css);

    expect(out.indexOf('@layer properties{')).toBe(0);
    expect(out.indexOf('@layer properties{')).toBeLessThan(out.indexOf('@layer theme'));
  });

  it('skips properties without an initial value', () => {
    const css =
      '@property --tw-no-initial{syntax:"*";inherits:false}' +
      '@property --tw-with{syntax:"*";inherits:false;initial-value:0px}';
    const out = inlinePropertyFallbacks(css);

    expect(out).toContain('--tw-with:0px');
    expect(out).not.toContain('--tw-no-initial:');
  });

  it('handles the unminified (dev-server) formatting', () => {
    const css = `@property --tw-ring-offset-width {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}`;
    const out = inlinePropertyFallbacks(css);
    expect(out).toContain('--tw-ring-offset-width:0px');
  });

  it('is a no-op for CSS without @property rules (token sheets)', () => {
    const css = ':host{--color-bg:#fff}';
    expect(inlinePropertyFallbacks(css)).toBe(css);
  });

  // The minifier collapses `initial-value: 0px` to `0`. Real @property
  // registration re-normalizes it through the typed syntax (<length> → 0px),
  // but a plain custom property substitutes the raw token — and
  // `calc(1px + 0)` is invalid, which silently killed every ring/shadow
  // composite. Typed dimension syntaxes must get their unit back; untyped
  // (`syntax:"*"`) properties store textually under real registration too,
  // so their bare zeros are left alone.
  it('restores units on bare-zero initial values for typed dimension syntaxes', () => {
    const css =
      '@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}' +
      '@property --tw-delay{syntax:"<time>";inherits:false;initial-value:0}' +
      '@property --tw-spin{syntax:"<angle>";inherits:false;initial-value:0}' +
      '@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}';
    const out = inlinePropertyFallbacks(css);

    expect(out).toContain('--tw-ring-offset-width:0px');
    expect(out).toContain('--tw-delay:0s');
    expect(out).toContain('--tw-spin:0deg');
    expect(out).toContain('--tw-translate-x:0;');
  });
});
