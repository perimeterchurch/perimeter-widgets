import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Freight Display Pro is published in perimeter.org's Typekit kits at weights
 * 400 and 500 ONLY. Ask for 700 and nothing fails — the browser matches the
 * 500 face and paints a heavier display cut than the brand ever uses (every
 * native perimeter.org serif heading computes to 400).
 *
 * This is a guard rather than a comment because NO local check can catch it.
 * The studio and the embed lab load a different Typekit kit (hpg7onr) which
 * DOES publish freight 700, so `font-bold` renders a real, deliberate-looking
 * bold in every preview and degrades to the 500 face only in production.
 * Same class of trap as the CORS allowlist: correct locally, wrong live.
 *
 * Scope is `widgets/` + `packages/ui/` — the sources that render inside a
 * widget shadow root, where `font-serif` resolves to the brand face. The
 * studio chrome has its own serif (`font-studio-serif`, Playfair) and is
 * covered by studio-font.test.ts instead.
 */
const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const SCANNED = ['widgets', 'packages/ui'];

const BOLD_UTILITY = /\bfont-(bold|semibold|extrabold|black)\b|\bfont-\[[5-9]\d\d\]/;

function sourceFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    if (entry === 'node_modules' || entry === 'dist') return [];
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

/**
 * Class lists live in string literals, and a `cn(...)` call can break one
 * element's classes across several. Scanning literals rather than raw lines
 * keeps a multi-line `className` from hiding the pairing.
 */
function classLiterals(source: string): string[] {
  return source.match(/'[^'\\]*'|"[^"\\]*"|`[^`\\]*`/g) ?? [];
}

describe('brand display serif weight', () => {
  const files = SCANNED.flatMap((rel) => sourceFiles(join(REPO_ROOT, rel)));

  it('finds widget sources to scan', () => {
    // A broken path would make every assertion below pass vacuously.
    expect(files.length).toBeGreaterThan(20);
  });

  it('never pairs font-serif with a bold weight', () => {
    const offenders: string[] = [];
    for (const file of files) {
      for (const literal of classLiterals(readFileSync(file, 'utf8'))) {
        if (!literal.includes('font-serif')) continue;
        if (!BOLD_UTILITY.test(literal)) continue;
        offenders.push(`${file.slice(REPO_ROOT.length)}: ${literal}`);
      }
    }
    expect(
      offenders,
      'Freight Display Pro has no face above 500 — use font-normal on font-serif',
    ).toEqual([]);
  });
});
