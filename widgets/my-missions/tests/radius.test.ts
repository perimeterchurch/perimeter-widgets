import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { globalTokens, type ThemeToken } from '@perimeter/theme';
import definition from '../src/widget';

const srcDir = path.resolve(__dirname, '../src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/** Full-line `//` comments and block comments — they discuss class names. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const RADIUS_UTILITY = /\brounded(?:-[a-z0-9[\]().-]+)?\b/g;
// The token scale (each pinned to 0px below) plus the explicit zero.
const TOKEN_SCALE = new Set(['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-none']);

/**
 * Deliberate exceptions to the token scale — a widget can pin an element off
 * the tokens on purpose. Keyed by repo-relative source path (POSIX-style),
 * value is the set of utilities allowed in that file. Everything else must be
 * on the token scale so a `themeOverrides` change reaches it.
 */
const RADIUS_EXCEPTIONS: Record<string, Set<string>> = {
  // The Leaders strip carries a circular photo + pill chip on purpose —
  // matches the legacy widget's chip shape and is the accent contrast against
  // the square rest of the widget, so it must NOT collapse to 0px when the
  // radius tokens do.
  'components/StatusSection.tsx': new Set(['rounded-full']),
  // rounded-4xl is written in the source too but no test file may name it —
  // the Tailwind scanner reads test files and would compile a live rule for
  // every widget. Sourced dynamically below instead.
};

// Fill in the pill radius on Leaders chips without spelling it — see the note
// on the scanner in the test comment below.
RADIUS_EXCEPTIONS['components/StatusSection.tsx'].add('rounded-' + '4xl');

describe('square corners', () => {
  it('pins every radius token to 0px', () => {
    // Perimeter's UI standard is 0px radius. The shared theme still ships
    // 4/8/12px for the other twelve widgets, so this widget overrides the
    // tokens for itself — which also squares off the shared @perimeter/ui
    // components it renders, since their `rounded-*` classes compile to
    // `var(--radius-*)`.
    const radiusTokens = (Object.keys(globalTokens) as ThemeToken[]).filter((k) =>
      k.startsWith('radius-'),
    );
    expect(radiusTokens.length).toBeGreaterThan(0);
    for (const token of radiusTokens) {
      // A token added to the theme later needs adding here too, or it ships
      // rounded: the override is per-token, not a wildcard.
      expect(definition.themeOverrides?.[token], token).toBe('0px');
    }
  });

  it('uses no radius utility outside the token scale (except allow-listed files)', () => {
    // The pill/xs/xl/2xl/3xl/4xl steps, an arbitrary bracket value and the
    // bare utility all compile to values Tailwind hardcodes into the CSS,
    // which a token override cannot reach — they survive as rounded corners.
    // That is what RADIUS_EXCEPTIONS allows on purpose (Leaders is round by
    // design) and what this rule denies everywhere else.
    //
    // Spelled out only via TOKEN_SCALE / RADIUS_EXCEPTIONS above, never as
    // prose: Tailwind's scanner treats a class name in a comment (or in this
    // very file) as a used class and compiles a rule for it into the widget's
    // CSS.
    const offenders = sourceFiles(srcDir).flatMap((file) => {
      const rel = path.relative(srcDir, file).split(path.sep).join('/');
      const allowed = RADIUS_EXCEPTIONS[rel] ?? new Set<string>();
      const matches = stripComments(readFileSync(file, 'utf8')).match(RADIUS_UTILITY) ?? [];
      return matches
        .filter((m) => !TOKEN_SCALE.has(m) && !allowed.has(m))
        .map((m) => `${rel}: ${m}`);
    });
    expect(offenders).toEqual([]);
  });
});
