# Studio Overhaul Phase 1 — Parity Audit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a parity-audit harness (CSS pipeline differ + WordPress fixture + Playwright visual/inheritance probes), run it against `example` and `sermons`, and produce a findings report that lets the user set the Phase 2 fix bar.

**Architecture:** A new dev-only workspace package `packages/parity` compiles each widget's CSS through both the dev (studio) and prod (`widgetConfig`) PostCSS pipelines and structurally diffs the output; a WordPress-like fixture page serves freshly built bundles through the real `cdn/loader.js` flow for Playwright screenshot comparison against the live studio; small probes quantify host-style inheritance and the components-path divergence. Findings land in `docs/superpowers/audits/2026-06-02-parity-audit-findings.md`.

**Tech Stack:** TypeScript, PostCSS + Tailwind v3 JS API, vitest, `@playwright/test` + pixelmatch, tsx. Spec: `docs/superpowers/specs/2026-06-02-studio-design-system-dx-overhaul-design.md`.

---

## Context for a zero-context engineer

How rendering works in this repo (read these files before starting):

- **Production:** each widget builds via `defineConfig(widgetConfig({ name }))` (`packages/vite-plugin-widget/src/config.ts`). That config (a) defines `process.env.NODE_ENV` as `"production"`, (b) adds a **rem→px PostCSS plugin** (`remToPxPlugin`, currently module-private), and Vite additionally applies the widget's own `postcss.config.js` → Tailwind with the **widget's** `tailwind.config.ts`, whose `content` is only `./src/**/*.{ts,tsx}`. The IIFE's `src/entry.ts` imports compiled CSS as a `?inline` string and calls `autoMount(widget, css)` → `mount()` (`packages/widget-runtime/src/mount.tsx`) → `applyStyles()` (`styling.ts`) injects CSS into a shadow root after `rewriteRootToHost`. Config arrives by parsing `data-*` attributes (`data-attrs.ts`: kebab→camel, zod coercion).
- **Dev (studio):** `studio/` is a separate Vite app. It imports `widgets/*/src/widget.tsx` + `styles.css?inline` via `import.meta.glob` (`studio/src/lib/discovery.ts`) and calls the same `mount()` (`studio/src/components/WidgetPreview.tsx`). BUT: the CSS is compiled by the **studio's** PostCSS pipeline (`studio/postcss.config.js` + `studio/tailwind.config.ts`, whose `content` also scans `../widgets/*/src` and `../packages/ui/src`), there is **no rem→px plugin**, React runs in dev mode, and config comes from a typed `configOverrides` object that bypasses `data-*` parsing.
- **UI components in the studio:** `ComponentPreview.tsx` renders `@perimeter/ui` exports in the **light DOM** with studio Tailwind and an inline token style — no shadow root, no widget pipeline at all.

Pre-identified hypotheses the audit must verify, quantify, or refute (do not assume — measure):

| # | Hypothesis | Stage |
| --- | --- | --- |
| H1 | Dev CSS keeps `rem` units (no `remToPxPlugin` in the studio pipeline); prod ships `px`. Visible whenever the host page's root `font-size` ≠ 16px. | CSS pipeline |
| H2 | Widget `tailwind.config.ts` `content` omits `packages/ui/src`, so utility classes used **only inside `@perimeter/ui` components** are missing from the shipped bundle while the studio (which scans ui src) shows them. Likely the user-visible mismatch. | CSS pipeline |
| H3 | `ComponentPreview` light-DOM path diverges structurally from in-widget rendering (no shadow root, studio preflight/base styles, no rem→px, tokens via inline style). | Components |
| H4 | Inheritable properties (`font-family`, `color`, `line-height`, …) pierce the shadow root from the host page; Tailwind preflight's `html`/`body` rules don't exist inside a shadow root, so widgets inherit WordPress fonts in prod but studio-canvas fonts in dev. | Host environment |
| H5 | React dev vs prod build (`NODE_ENV`) — behavioral differences only (double-render in StrictMode is N/A, no StrictMode in studio; warnings, error overlays). | Runtime |
| H6 | The studio's `configOverrides` seam bypasses `parseDataAttrs` (kebab→camel + zod coercion is never exercised in studio unless `data-*` attrs are set on the host), and overrides merged after parsing skip schema re-validation (`mount.tsx:49-52`). | Config/data |

Repo rules that apply to every task (from `CLAUDE.md`):

- `pnpm` only; never npm/npx. Run tests from the root via turbo: `pnpm exec turbo run test --filter=@perimeter/parity --force` (`--force` because turbo cache replays can mask whether tests actually ran).
- Never commit to `dev`/`main`. All work on `feat/parity-audit` off `dev`.
- Conventional commits. `pnpm format` before `pnpm quality`.
- PR bodies via the Write tool + `gh pr create --body-file` — never inline `--body`.

---

## Chunk 1: Harness foundation — `packages/parity` + CSS pipeline differ

### Task 1: Branch + scaffold `packages/parity`

**Files:**
- Create: `packages/parity/package.json`
- Create: `packages/parity/tsconfig.json`
- Create: `packages/parity/.gitignore`

- [ ] **Step 1: Create the execution branch off up-to-date dev**

```bash
git fetch --prune
git checkout -B feat/parity-audit origin/dev
```

- [ ] **Step 2: Scaffold the package** (mirrors `packages/release` — dev-only, no build task)

`packages/parity/package.json`:

```json
{
  "name": "@perimeter/parity",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "lint": "eslint src tests",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "visual": "playwright test"
  },
  "dependencies": {
    "@perimeter/theme": "workspace:*",
    "@perimeter/vite-plugin-widget": "workspace:*"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.10.5",
    "autoprefixer": "^10.4.20",
    "pixelmatch": "^6.0.0",
    "pngjs": "^7.0.0",
    "@types/pngjs": "^6.0.5",
    "postcss": "^8.5.1",
    "postcss-import": "^16.1.0",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vitest": "^2.1.8"
  }
}
```

`packages/parity/tsconfig.json` — copy `packages/release/tsconfig.json` verbatim, then add `"types": ["node"]` only if release's doesn't already include it (read it first; match the repo's existing compiler options exactly).

`packages/parity/.gitignore`:

```
reports/
test-results/
```

- [ ] **Step 3: Install + verify the workspace picks it up**

```bash
pnpm install
pnpm --filter @perimeter/parity exec tsc --version
```

Expected: tsc prints a version; no workspace errors. (`pnpm-workspace.yaml` already globs `packages/*` — no edit needed.)

- [ ] **Step 4: Check eslint coverage.** Look at how `packages/release` wires eslint (flat config at repo root vs per-package). If the root config auto-covers `packages/*`, nothing to do; otherwise mirror release's setup. Verify: `pnpm --filter @perimeter/parity lint` runs (an empty `src/` may need a placeholder — fine to defer until Task 3 creates real files; in that case just note lint runs in Task 3).

- [ ] **Step 5: Commit**

```bash
git add packages/parity pnpm-lock.yaml
git commit -m "chore(parity): scaffold dev-only parity-audit package"
```

### Task 2: Export `remToPxPlugin` from `@perimeter/vite-plugin-widget`

The audit must test the **real** plugin, not a copy. It's currently module-private in `packages/vite-plugin-widget/src/config.ts:11`.

**Files:**
- Modify: `packages/vite-plugin-widget/src/config.ts:11` (add `export` to `remToPxPlugin`)
- Modify: `packages/vite-plugin-widget/src/index.ts` (re-export)
- Test: `packages/vite-plugin-widget/tests/` (find the existing test file pattern; add a test beside it)

- [ ] **Step 1: Write the failing test** (in the package's existing test dir — read one existing test first and match its style)

```ts
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import { remToPxPlugin } from '../src/index.ts';

describe('remToPxPlugin export', () => {
  it('rewrites rem lengths to px at 16px/rem', async () => {
    const out = await postcss([remToPxPlugin]).process('.a{margin:1.5rem 0;width:2rem}', {
      from: undefined,
    });
    expect(out.css).toBe('.a{margin:24px 0;width:32px}');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
pnpm exec turbo run test --filter=@perimeter/vite-plugin-widget --force
```

Expected: FAIL — `remToPxPlugin` is not exported.

- [ ] **Step 3: Export the plugin.** In `config.ts` change `const remToPxPlugin = {` → `export const remToPxPlugin = {`; in `index.ts` add:

```ts
export { remToPxPlugin } from './config.ts';
```

(`postcss` may need to be a devDependency of the package for the test — add it if the test can't resolve it.)

- [ ] **Step 4: Run tests to verify pass** — same command. Expected: PASS, including all pre-existing tests.

- [ ] **Step 5: Commit**

```bash
git add packages/vite-plugin-widget
git commit -m "feat(vite-plugin-widget): export remToPxPlugin for parity harness"
```

### Task 3: Pipeline compilers — `compileDevCss` / `compileProdCss`

Replicate both CSS pipelines faithfully enough to diff. Known fidelity limits (document, don't fight): the prod harness output is **pre-minification** (esbuild minify is assumed semantics-preserving; the Playwright check covers the real bundle), and `postcss-import` stands in for Vite's own `@import` inlining **in both pipelines equally** (sermons' `styles.css` `@import`s react-pdf CSS).

**Files:**
- Create: `packages/parity/src/pipelines.ts`
- Test: `packages/parity/tests/pipelines.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { compileDevCss, compileProdCss, repoRoot } from '../src/pipelines.ts';

const example = path.join(repoRoot, 'widgets/example');

describe('css pipelines', () => {
  it('prod pipeline emits px (rem→px applied)', async () => {
    const css = await compileProdCss(example);
    expect(css).not.toMatch(/[\d.]rem\b/);
    // Assert on a utility the widget's OWN source guarantees (app.tsx uses p-4).
    // Do NOT assert `--color-` here: the widget's tailwind content scans only its
    // own src, and example's color utilities live inside @perimeter/ui — their
    // absence from prod CSS is the H2 finding itself, not a harness bug.
    expect(css).toMatch(/\.p-4\s*\{[^}]*padding:\s*16px/);
  }, 60_000);

  it('dev pipeline compiles the same source through the studio config', async () => {
    const css = await compileDevCss(example);
    // The studio config scans packages/ui/src, so ui-component color utilities
    // (var(--color-…) references) ARE generated in dev — the other half of H2.
    expect(css).toContain('var(--color-');
    expect(css).toMatch(/\.p-4\s*\{[^}]*padding:\s*1rem/); // and no rem→px in dev (H1)
  }, 60_000);
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm exec turbo run test --filter=@perimeter/parity --force
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/pipelines.ts`**

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import type { Config } from 'tailwindcss';
import { remToPxPlugin } from '@perimeter/vite-plugin-widget';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Load a tailwind.config.ts and resolve its relative content globs against the
 * config's own directory (the build runs with cwd = that directory; the harness
 * does not, so globs must be made absolute to match). */
async function loadTailwindConfig(dir: string): Promise<Config> {
  const mod = (await import(pathToFileURL(path.join(dir, 'tailwind.config.ts')).href)) as {
    default: Config;
  };
  const config = mod.default;
  const content = (config.content as string[]).map((g) =>
    path.isAbsolute(g) ? g : path.resolve(dir, g),
  );
  return { ...config, content };
}

async function run(plugins: postcss.AcceptedPlugin[], widgetDir: string): Promise<string> {
  const from = path.join(widgetDir, 'src/styles.css');
  const source = readFileSync(from, 'utf8');
  const result = await postcss(plugins).process(source, { from });
  return result.css;
}

/** Production pipeline: the widget's own tailwind config (content = widget src only)
 * + autoprefixer + the real remToPxPlugin from widgetConfig(). Pre-minification. */
export async function compileProdCss(widgetDir: string): Promise<string> {
  const config = await loadTailwindConfig(widgetDir);
  return run([postcssImport(), tailwindcss(config), autoprefixer(), remToPxPlugin], widgetDir);
}

/** Dev (studio) pipeline: the STUDIO's tailwind config (content also scans
 * widgets/* and packages/ui) + autoprefixer. No rem→px — exactly what the Vite
 * dev server applies to a widget's styles.css?inline import. */
export async function compileDevCss(widgetDir: string): Promise<string> {
  const config = await loadTailwindConfig(path.join(repoRoot, 'studio'));
  return run([postcssImport(), tailwindcss(config), autoprefixer()], widgetDir);
}

/** Classes generated for @perimeter/ui source alone — used to attribute
 * dev-only selectors to ui components (H2). */
export async function compileUiOnlyCss(): Promise<string> {
  const base = await loadTailwindConfig(path.join(repoRoot, 'studio'));
  const config: Config = {
    ...base,
    content: [path.join(repoRoot, 'packages/ui/src/**/*.{ts,tsx}')],
  };
  return run([postcssImport(), tailwindcss(config), autoprefixer()], path.join(repoRoot, 'widgets/example'));
}
```

Implementation notes for the executor:
- `tailwindcss(config)` accepts a config **object** in v3 — no temp config file needed.
- Importing `tailwind.config.ts` (TypeScript) works because vitest/tsx transform on the fly.
- If `@perimeter/theme/tailwind` fails to resolve from a dynamically imported config, run tests once and read the error — the studio/widgets already import it the same way, so it should resolve via workspace deps; if not, add `@perimeter/theme` to parity's deps (already listed).

- [ ] **Step 4: Run tests to verify pass** — same turbo command. Expected: PASS (these are real compiles; 60s timeouts are intentional).

- [ ] **Step 5: Commit**

```bash
git add packages/parity
git commit -m "feat(parity): dev and prod css pipeline compilers"
```

### Task 4: Structured CSS differ

**Files:**
- Create: `packages/parity/src/diff.ts`
- Test: `packages/parity/tests/diff.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { diffCss } from '../src/diff.ts';

describe('diffCss', () => {
  it('finds selectors present in only one side', () => {
    const d = diffCss('.a{color:red}.b{color:blue}', '.a{color:red}');
    expect(d.onlyInA).toEqual(['.b']);
    expect(d.onlyInB).toEqual([]);
  });

  it('finds value differences and classifies rem→px', () => {
    const d = diffCss('.a{margin:1.5rem}', '.a{margin:24px}');
    expect(d.valueDiffs).toEqual([
      { selector: '.a', prop: 'margin', a: '1.5rem', b: '24px', kind: 'rem-px' },
    ]);
  });

  it('keys media-scoped rules separately', () => {
    const d = diffCss('@media (min-width:768px){.a{color:red}}', '.a{color:red}');
    expect(d.onlyInA).toEqual(['@media (min-width:768px) :: .a']);
    expect(d.onlyInB).toEqual(['.a']);
  });

  it('normalizes whitespace and last-wins duplicate declarations', () => {
    const d = diffCss('.a{color: red;color:blue}', '.a{color:blue}');
    expect(d.valueDiffs).toEqual([]);
    expect(d.onlyInA).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm exec turbo run test --filter=@perimeter/parity --force`. Expected: FAIL.

- [ ] **Step 3: Implement `src/diff.ts`**

```ts
import postcss, { type Container } from 'postcss';

export interface ValueDiff {
  selector: string;
  prop: string;
  a: string;
  b: string;
  /** 'rem-px' when a is the b value expressed in rem at 16px/rem; else 'other'. */
  kind: 'rem-px' | 'other';
}

export interface CssDiff {
  onlyInA: string[];
  onlyInB: string[];
  valueDiffs: ValueDiff[];
}

type Index = Map<string, Map<string, string>>;

const REM_RE = /(-?[\d.]+)rem\b/g;
const remToPx = (v: string) => v.replace(REM_RE, (_m, n: string) => `${parseFloat(n) * 16}px`);
const norm = (v: string) => v.replace(/\s+/g, ' ').trim();

/** Index declarations by "<atrule-context> :: <selector>" (or bare selector),
 * prop → value, later declarations win (cascade within an equal-specificity sheet). */
function indexCss(css: string): Index {
  const root = postcss.parse(css);
  const index: Index = new Map();
  root.walkRules((rule) => {
    const contexts: string[] = [];
    let parent: Container | undefined = rule.parent as Container | undefined;
    while (parent && parent.type === 'atrule') {
      const at = parent as unknown as { name: string; params: string };
      contexts.unshift(`@${at.name} (${norm(at.params).replace(/^\(|\)$/g, '')})`);
      parent = parent.parent as Container | undefined;
    }
    for (const selector of rule.selectors ?? [rule.selector]) {
      const key = contexts.length
        ? `${contexts.join(' ')} :: ${norm(selector)}`
        : norm(selector);
      const decls = index.get(key) ?? new Map<string, string>();
      rule.walkDecls((decl) => {
        if (decl.parent === rule) decls.set(decl.prop, norm(decl.value));
      });
      index.set(key, decls);
    }
  });
  return index;
}

export function diffCss(a: string, b: string): CssDiff {
  const ia = indexCss(a);
  const ib = indexCss(b);
  const onlyInA = [...ia.keys()].filter((k) => !ib.has(k)).sort();
  const onlyInB = [...ib.keys()].filter((k) => !ia.has(k)).sort();
  const valueDiffs: ValueDiff[] = [];
  for (const [selector, declsA] of ia) {
    const declsB = ib.get(selector);
    if (!declsB) continue;
    for (const [prop, va] of declsA) {
      const vb = declsB.get(prop);
      if (vb === undefined || vb === va) continue;
      valueDiffs.push({
        selector,
        prop,
        a: va,
        b: vb,
        kind: remToPx(va) === vb ? 'rem-px' : 'other',
      });
    }
  }
  return { onlyInA, onlyInB, valueDiffs };
}
```

Note: the `@media` key format in the test (`@media (min-width:768px) :: .a`) must match the implementation's normalization — adjust the test expectation to the exact produced string on the first run if the params normalization differs (e.g. spacing); the contract that matters is *stable keys + media-scoped separation*, not the precise format.

- [ ] **Step 4: Run tests to verify pass.** Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/parity
git commit -m "feat(parity): structured css differ with rem→px classification"
```

### Task 5: CSS pipeline report script

**Files:**
- Create: `packages/parity/src/report-css.ts`
- Modify: `package.json` (root — add script)

- [ ] **Step 1: Implement the report script**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compileDevCss, compileProdCss, compileUiOnlyCss, repoRoot } from './pipelines.ts';
import { diffCss } from './diff.ts';

const widgets = process.argv.slice(2);
if (widgets.length === 0) {
  console.error('usage: pnpm parity:css <widget-name> [...more]');
  process.exit(1);
}

const reportsDir = path.join(repoRoot, 'packages/parity/reports');
mkdirSync(reportsDir, { recursive: true });

const uiCss = await compileUiOnlyCss();
const uiSelectors = new Set(
  [...uiCss.matchAll(/(?<=^|\})\s*([^@{}]+)\{/g)].flatMap((m) =>
    m[1]!.split(',').map((s) => s.replace(/\s+/g, ' ').trim()),
  ),
);

for (const name of widgets) {
  const dir = path.join(repoRoot, 'widgets', name);
  const [dev, prod] = await Promise.all([compileDevCss(dir), compileProdCss(dir)]);
  const d = diffCss(dev, prod);
  const devOnlyUi = d.onlyInA.filter((s) => uiSelectors.has(s.split(' :: ').pop()!));
  const remPx = d.valueDiffs.filter((v) => v.kind === 'rem-px');
  const other = d.valueDiffs.filter((v) => v.kind === 'other');

  const lines = [
    `# CSS pipeline diff — \`${name}\` (dev=studio pipeline, prod=widgetConfig pipeline)`,
    '',
    `| metric | count |`,
    `| --- | --- |`,
    `| selectors only in dev | ${d.onlyInA.length} |`,
    `| …of which attributable to @perimeter/ui (H2) | ${devOnlyUi.length} |`,
    `| selectors only in prod | ${d.onlyInB.length} |`,
    `| value diffs, rem→px (H1) | ${remPx.length} |`,
    `| value diffs, other | ${other.length} |`,
    '',
    `## Selectors only in dev attributable to @perimeter/ui (missing from shipped bundle)`,
    ...devOnlyUi.map((s) => `- \`${s}\``),
    '',
    `## Other selectors only in dev (superset noise: studio src, html scan — interpret manually)`,
    ...d.onlyInA.filter((s) => !devOnlyUi.includes(s)).slice(0, 200).map((s) => `- \`${s}\``),
    '',
    `## Selectors only in prod`,
    ...d.onlyInB.map((s) => `- \`${s}\``),
    '',
    `## Non-rem value diffs (each needs a human verdict)`,
    ...other.map((v) => `- \`${v.selector}\` \`${v.prop}\`: dev=\`${v.a}\` prod=\`${v.b}\``),
    '',
    `## rem→px value diffs (sample, first 20 of ${remPx.length})`,
    ...remPx.slice(0, 20).map((v) => `- \`${v.selector}\` \`${v.prop}\`: dev=\`${v.a}\` prod=\`${v.b}\``),
    '',
  ];
  const file = path.join(reportsDir, `css-pipeline-${name}.md`);
  writeFileSync(file, lines.join('\n'));
  console.log(`wrote ${file}`);
}
```

- [ ] **Step 2: Add the root script.** In the root `package.json` `scripts`, next to `"release"`:

```json
"parity:css": "tsx packages/parity/src/report-css.ts"
```

- [ ] **Step 3: Run it**

```bash
pnpm parity:css example sermons
```

Expected: two report files under `packages/parity/reports/` (gitignored). Open both; sanity-check that **both** reports show a nonzero "attributable to @perimeter/ui" count (H2) and nonzero rem→px diffs (H1) — `example` uses `@perimeter/ui/card` and is the cleaner H2 specimen (no live-API noise); `sermons` shows it at production scale. If H2 shows **zero**, investigate before proceeding — either the hypothesis is wrong (record that; it's a finding too) or selector matching is broken (e.g. ui selectors arriving media-scoped — fix the matching).

- [ ] **Step 4: Quality + commit**

```bash
pnpm format && pnpm quality
git add packages/parity package.json
git commit -m "feat(parity): css pipeline diff report script (pnpm parity:css)"
```

---

## Chunk 2: WordPress fixture + Playwright visual & inheritance probes

### Task 6: WordPress-like fixture + static server

The fixture is the **single source of truth** for "what a WordPress host page looks like" — Phase 2's host-page-sim canvas background reuses it. Its styles must be **derived from the real perimeter.org page, with provenance pinned in a comment**, not invented.

**Files:**
- Create: `packages/parity/fixtures/wordpress.html`
- Create: `packages/parity/src/serve-fixture.ts`
- Test: `packages/parity/tests/serve-fixture.test.ts`

- [ ] **Step 1: Derive the host-page styles.** Fetch the live page and extract the effective styles of the region where a widget embed would sit:

```bash
curl -sL https://perimeter.org -o /tmp/perimeter-home.html
```

From the HTML + its main stylesheet, record: `html`/`body` `font-size`, `font-family`, `color`, `line-height`, `background-color`, and the main content container's `max-width` + horizontal padding. If the page is unreachable or styles are inscrutable from static CSS, use a browser via Playwright in a scratch script to read `getComputedStyle(document.body)` — and if that also fails, fall back to documented WordPress-theme defaults **and mark the fixture header `provenance: FALLBACK`** so the findings report flags it.

- [ ] **Step 2: Write the fixture page**

```html
<!doctype html>
<!--
  WordPress host-page fixture — the single source of truth for "production page"
  styling in parity work (audit + the studio host-page-sim background).
  provenance: derived from https://perimeter.org on 2026-06-02 (REPLACE with
  actual values + date; list each derived property and where it came from).
-->
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Widget parity fixture</title>
    <style>
      /* DERIVED VALUES — replace each with the measured value from Step 1 */
      html { font-size: 16px; }
      body {
        margin: 0;
        font-family: /* derived */ Georgia, serif;
        font-size: /* derived */ 18px;
        line-height: /* derived */ 1.7;
        color: /* derived */ #333333;
        background: /* derived */ #ffffff;
      }
      .content { max-width: /* derived */ 1140px; margin: 0 auto; padding: 0 24px; }
    </style>
  </head>
  <body>
    <div class="content">
      <h1>Fixture page</h1>
      <p>Surrounding host copy, so inherited styles are realistic.</p>
      <div data-perimeter-widget="__WIDGET__"></div>
    </div>
    <script src="/loader.js" async></script>
  </body>
</html>
```

- [ ] **Step 3: Implement the fixture server.** Serves, with `cache-control: no-store`: `/{name}.html` → fixture with `__WIDGET__` substituted; `/loader.js` → the real `cdn/loader.js`; `/manifest.json` → `{"<name>":"dev", ...}` for every `widgets/*` with a `dist/index.js`; `/<name>/dev/index.js` (+`.map`) → `widgets/<name>/dist/index.js` — i.e. the **freshly built** bundle through the **real loader flow**.

```ts
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { repoRoot } from './pipelines.ts';

export const FIXTURE_PORT = 4173;

export function startFixtureServer(port = FIXTURE_PORT) {
  const fixture = readFileSync(
    path.join(repoRoot, 'packages/parity/fixtures/wordpress.html'),
    'utf8',
  );
  const widgetsDir = path.join(repoRoot, 'widgets');
  const built = () =>
    readdirSync(widgetsDir).filter((n) =>
      existsSync(path.join(widgetsDir, n, 'dist/index.js')),
    );

  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0]!;
    const send = (code: number, type: string, body: string | Buffer) => {
      res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(body);
    };
    if (url === '/loader.js') {
      return send(200, 'text/javascript', readFileSync(path.join(repoRoot, 'cdn/loader.js')));
    }
    if (url === '/manifest.json') {
      return send(200, 'application/json', JSON.stringify(Object.fromEntries(built().map((n) => [n, 'dev']))));
    }
    const page = /^\/([\w-]+)\.html$/.exec(url);
    if (page) return send(200, 'text/html', fixture.replaceAll('__WIDGET__', page[1]!));
    const bundle = /^\/([\w-]+)\/dev\/(index\.js(?:\.map)?)$/.exec(url);
    if (bundle) {
      const file = path.join(widgetsDir, bundle[1]!, 'dist', bundle[2]!);
      if (existsSync(file)) {
        return send(200, bundle[2]!.endsWith('.map') ? 'application/json' : 'text/javascript', readFileSync(file));
      }
    }
    send(404, 'text/plain', 'not found');
  });
  server.listen(port);
  return server;
}

// CLI entry: `tsx packages/parity/src/serve-fixture.ts`
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href) {
  startFixtureServer();
  console.log(`fixture server on http://localhost:${FIXTURE_PORT}`);
}
```

(The CLI-entry guard pattern: verify it actually fires under `tsx` on this platform — if flaky, replace with an unconditional `startFixtureServer()` in a separate `src/serve-fixture-cli.ts` entry. Don't burn time on detection cleverness.)

- [ ] **Step 4: Write + run a server test** — start on an ephemeral port (pass `0`, read `server.address()`), fetch `/manifest.json` and `/example.html`, assert the manifest lists `example` (after a build) and the HTML contains `data-perimeter-widget="example"`. Build first so dist exists:

```bash
pnpm --filter ./widgets/example build
pnpm exec turbo run test --filter=@perimeter/parity --force
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/parity
git commit -m "feat(parity): wordpress fixture page + static fixture server"
```

### Task 7: Playwright visual comparison — studio vs fixture

**Files:**
- Create: `packages/parity/playwright.config.ts`
- Create: `packages/parity/visual/visual-parity.spec.ts`
- Modify: `packages/parity/package.json` (exclude `visual/` from vitest if vitest picks it up — set `"test": "vitest run --dir tests"`)

- [ ] **Step 1: Install the browser**

```bash
pnpm --filter @perimeter/parity exec playwright install chromium
```

- [ ] **Step 2: Playwright config** — two web servers (the studio dev server + the fixture server), one project at a fixed viewport:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './visual',
  timeout: 90_000,
  use: { viewport: { width: 1280, height: 2000 }, deviceScaleFactor: 1 },
  webServer: [
    {
      command: 'pnpm --filter @perimeter/studio dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      cwd: '../..',
      timeout: 60_000,
    },
    {
      command: 'pnpm exec tsx src/serve-fixture.ts',
      url: 'http://localhost:4173/manifest.json',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
```

- [ ] **Step 3: The comparison spec.** For each of `example`, `sermons`: screenshot the widget **element** on both sides at the same content width, pixelmatch them, write `reports/visual-<name>-{studio,fixture,diff}.png` and a `reports/visual-<name>.md` with the mismatch ratio.

```ts
import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const WIDGETS = ['example', 'sermons'];
mkdirSync('reports', { recursive: true });

for (const name of WIDGETS) {
  test(`visual parity: ${name}`, async ({ page }) => {
    // Studio side: select the widget in the current UI (no routes yet — click the
    // sidebar button), wait for the shadow-root mount to settle.
    await page.goto('http://localhost:5173');
    await page.getByRole('button', { name, exact: true }).click();
    const studioHost = page.locator('[data-perimeter-widget-preview]');
    await expect(studioHost.locator(':scope > div')).toBeAttached(); // react root in shadow? see note
    await page.waitForTimeout(3000); // data/images settle — crude but this is a one-shot audit
    const studioShot = PNG.sync.read(await studioHost.screenshot());

    // Fixture side: the real loader flow against the freshly built bundle.
    await page.goto(`http://localhost:4173/${name}.html`);
    const fixtureHost = page.locator(`[data-perimeter-widget="${name}"]`);
    await page.waitForTimeout(3000);
    const fixtureShot = PNG.sync.read(await fixtureHost.screenshot());

    const width = Math.min(studioShot.width, fixtureShot.width);
    const height = Math.min(studioShot.height, fixtureShot.height);
    const diff = new PNG({ width, height });
    const mismatched = pixelmatch(
      studioShot.data, fixtureShot.data, diff.data, width, height,
      { threshold: 0.1 },
    );
    const ratio = mismatched / (width * height);

    writeFileSync(`reports/visual-${name}-studio.png`, PNG.sync.write(studioShot));
    writeFileSync(`reports/visual-${name}-fixture.png`, PNG.sync.write(fixtureShot));
    writeFileSync(`reports/visual-${name}-diff.png`, PNG.sync.write(diff));
    writeFileSync(
      `reports/visual-${name}.md`,
      [
        `# Visual parity — ${name}`,
        `- studio: ${studioShot.width}x${studioShot.height}`,
        `- fixture: ${fixtureShot.width}x${fixtureShot.height}`,
        `- mismatched pixels: ${mismatched} (${(ratio * 100).toFixed(2)}%)`,
        `- note: sermons hits the live API — data/image variance inflates the number; read the diff image, not just the ratio.`,
      ].join('\n'),
    );
    // No hard assertion on ratio — this is measurement, not a gate. Phase 2 may add one.
    expect(mismatched).toBeGreaterThanOrEqual(0);
  });
}
```

Executor notes:
- The `:scope > div` react-root assertion may not work through a shadow boundary from a plain locator — if it doesn't, replace with `page.waitForFunction` reading `document.querySelector('[data-perimeter-widget-preview]')?.shadowRoot?.childElementCount`. Get *some* deterministic mount signal plus the settle timeout; don't ship a pure sleep if avoidable.
- **Pixel dimensions will differ** (studio canvas has `p-6` padding and a 16rem+18rem flanking layout; fixture content is 1140px). Crop to the min box as coded, and record both sizes — the *width mismatch itself is a finding* (studio canvas ≠ production content width).
- Both widgets must be built first: `pnpm --filter ./widgets/example build && pnpm --filter ./widgets/sermons build`.

- [ ] **Step 4: Run it**

```bash
pnpm --filter ./widgets/example build && pnpm --filter ./widgets/sermons build
pnpm --filter @perimeter/parity visual
```

Expected: PASS (it's measurement); `reports/` contains 6 PNGs + 2 MDs. **Open the diff images** and triage what you see: rem-vs-px shifts (H1), missing ui-component styling in the fixture (H2), font differences (H4). Write rough notes now — Task 10 consumes them.

- [ ] **Step 5: Make sure vitest and playwright don't collide.** `pnpm --filter @perimeter/parity test` must NOT try to run `visual/*.spec.ts` (set `"test": "vitest run --dir tests"` or a vitest `exclude`). Verify both commands run clean. (Deliberate: `lint` covers `src tests` only — `visual/` probes are one-shot audit scripts and stay outside the lint gate.)

- [ ] **Step 6: Commit**

```bash
git add packages/parity
git commit -m "feat(parity): playwright visual comparison, studio vs wordpress fixture"
```

### Task 8: Host-style inheritance probe (H4)

**Files:**
- Create: `packages/parity/visual/inheritance.spec.ts`

- [ ] **Step 1: Write the probe.** On the fixture page for `example`: read computed styles of a text element inside the shadow root; then mutate host `body` styles (`font-family: cursive`, `font-size: 24px`, `color: rgb(200, 0, 0)`, `line-height: 2.5`) via `page.addStyleTag`; re-read; record which properties changed (= inherited through the shadow boundary).

```ts
import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const PROPS = ['font-family', 'font-size', 'color', 'line-height'] as const;

test('host-style inheritance through the shadow root', async ({ page }) => {
  await page.goto('http://localhost:4173/example.html');
  await page.waitForFunction(
    () => !!document.querySelector('[data-perimeter-widget="example"]')?.shadowRoot?.firstElementChild,
  );

  const read = () =>
    page.evaluate((props) => {
      const shadow = document.querySelector('[data-perimeter-widget="example"]')!.shadowRoot!;
      const el =
        shadow.querySelector('p, h1, h2, h3, span, div div') ?? shadow.firstElementChild!;
      const cs = getComputedStyle(el as Element);
      return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    }, [...PROPS]);

  const before = await read();
  await page.addStyleTag({
    content: 'body{font-family:cursive !important;font-size:24px !important;color:rgb(200,0,0) !important;line-height:2.5 !important}',
  });
  const after = await read();

  const rows = PROPS.map((p) => {
    const inherited = before[p] !== after[p];
    return `| \`${p}\` | \`${before[p]}\` | \`${after[p]}\` | ${inherited ? '**YES — pierces shadow**' : 'no'} |`;
  });
  writeFileSync(
    'reports/inheritance.md',
    [
      '# Host-style inheritance probe (H4)',
      '',
      '| property | default host | mutated host | inherited into widget? |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
      'Every YES row = a property the studio canvas must replicate (host-page sim) and/or the widget CSS must pin.',
    ].join('\n'),
  );
});
```

- [ ] **Step 2: Run + inspect**

```bash
pnpm --filter @perimeter/parity visual
```

Expected: PASS; `reports/inheritance.md` has the table. Note: if the example widget's own CSS already pins a property (e.g. Tailwind sets `font-family` on the wrapper via the `font-sans` token var), the probe shows "no" for it — that itself is signal (it means the token, not the host, controls it). Record per-property reasoning, not just the boolean.

- [ ] **Step 3: Commit**

```bash
git add packages/parity
git commit -m "feat(parity): host-style shadow inheritance probe"
```

### Task 9: Components-path quantification (H3)

No new harness — reuse the differ to compare the two CSS worlds a `@perimeter/ui` component can live in, plus a focused code-read.

**Files:**
- Create: `packages/parity/src/report-components.ts`
- Modify: `package.json` (root — add `"parity:components": "tsx packages/parity/src/report-components.ts"`)

- [ ] **Step 1: Implement.** Compare (a) the **studio light-DOM pipeline** (studio tailwind config compiled against `studio/src/styles.css` — what `ComponentPreview` runs under today) against (b) a **widget-pipeline compile of ui content** (content = `packages/ui/src` only, + `remToPxPlugin` — what those classes become inside a shipped widget). Reuse `loadTailwindConfig`/`run` patterns from `pipelines.ts` (export small helpers rather than duplicating). Write `reports/components-path.md` with the same metric table as Task 5 plus a hand-written structural section (committed knowledge, not measured): light DOM vs shadow root; studio preflight + `index.html` base styles apply in (a) but never in (b); tokens arrive via inline `style` on a wrapper div in (a) vs `:host` CSS-variable sheet in (b); no `rewriteRootToHost` in (a).

- [ ] **Step 2: Run + sanity-check**

```bash
pnpm parity:components
```

Expected: report written; the rem→px count should be large (every spacing utility); selector-set differences should reflect studio-only content noise. Note anything surprising.

- [ ] **Step 3: Quality + commit**

```bash
pnpm format && pnpm quality
git add packages/parity package.json
git commit -m "feat(parity): components-path css divergence report"
```

---

## Chunk 3: Code-read audit, findings report, PR

### Task 10: Runtime + config/data code-read audit (H5, H6, and verification of the rest)

Investigation only — no new code. Output: raw notes per area in a scratch file (`packages/parity/reports/code-read-notes.md`, gitignored) that Task 11 distills.

- [ ] **Step 1: Runtime audit.** Read `packages/vite-plugin-widget/src/config.ts` (the `define` block), `packages/widget-runtime/src/styling.ts`, `mount.tsx`, `auto-mount.ts`, and `packages/theme/src/css.ts` + `resolver.ts`. Answer precisely, citing `file:line`:
  - React dev vs prod: what behavioral deltas exist in the studio (dev warnings, error boundaries behavior, no minification)? Any *visual* impact? (Expected: none — record the argument.)
  - `rewriteRootToHost`: applied identically in both paths? (Both go through `applyStyles` — verify it is the **sole** CSS-injection point into the shadow root, and that the studio's `index.html`/`src/styles.css` target only the light DOM, so studio chrome styles cannot reach widget internals except via inheritable properties — which is H4, not a separate leak.)
  - `adoptedStyleSheets` vs `<style>` fallback: which browsers get the fallback, and is ordering/cascade identical? (Read `countAppliedSheets` usage in tests.)
  - `__PERIMETER_WIDGET_VERSION__` and any other `define`s: do they exist in the dev path at all, and does anything render them?
- [ ] **Step 2: Config/data audit.** Read `data-attrs.ts`, `WidgetPreview.tsx`, `ConfigPanel.tsx`, `mount.tsx:47-52`. Answer:
  - H6 precisely: in the studio, which parsing/coercion/validation steps are skipped? Can a widget work in studio and crash in prod (or vice versa) because of it? (The historical `z.coerce.number()` bug is the known instance — the studio masked it. Cite it.)
  - Are `data-theme-*` attribute overrides exercised anywhere in the studio? (ThemeEditor uses `updateTokens`, a different seam — confirm.)
- [ ] **Step 3: API/auth audit.** Read `mount.tsx:16-19`, `packages/api-client/src` (base URL handling), `packages/auth/src` (`MPLocalStorageAuth`), `providers/auth-gate.tsx`. Answer: same API base URL dev vs prod (`https://api.perimeter.org` both — confirm `__PERIMETER_API_URL__` is unset in both)? CORS implications of localhost:5173 vs widgets.perimeter.org? What does an authenticated widget do in the studio where the WordPress `mpp-widgets_AuthToken` localStorage key is absent — and is that a *parity gap to fix* or *expected dev behavior to document*?
- [ ] **Step 4: Write up the notes file** with one section per area, each citing files/lines and ending with a verdict: `DIVERGENCE (user-visible)`, `DIVERGENCE (behavioral only)`, or `NO DIVERGENCE`.

### Task 11: Assemble the findings report

**Files:**
- Create: `docs/superpowers/audits/2026-06-02-parity-audit-findings.md`

- [ ] **Step 1: Distill everything** (Task 5 + 7 + 8 + 9 reports, Task 10 notes) into the findings doc. Required structure:

```markdown
# Parity Audit Findings — 2026-06-02

**Verdict in one paragraph:** <the headline: which hypotheses confirmed, which user-visible, what the biggest fix is>

## Summary table

| # | Divergence | Stage | Dev behavior | Prod behavior | User-visible impact | Proposed fix | Effort |
| --- | --- | --- | --- | --- | --- | --- | --- |
<one row per confirmed divergence; effort S/M/L; sort by impact>

## Refuted / no-divergence findings
<each hypothesis that did NOT pan out, with the evidence — these prevent re-litigating later>

## Detailed findings
<one section per row: evidence (report excerpts, file:line cites, diff-image references), the
exact mechanism, and the proposed fix with enough specificity that Phase 2 planning can
consume it directly>

## Fixture provenance
<what was derived from perimeter.org, when, how; or the FALLBACK flag>

## Recommended Phase 2 fix bar (proposal for user decision)
<a short menu: "must fix" / "should fix" / "accept + document", with rationale>
```

Rules: every claim cites evidence (a harness report number, a diff image, or `file:line`); the H-numbers from this plan are carried through so the spec's hypotheses are all accounted for; anything discovered that was *not* hypothesized gets its own row flagged `NEW`.

- [ ] **Step 2: Self-check against the spec.** Open the spec's Phase 1 section; confirm all six stages (CSS pipeline, runtime, host environment, components path, config/data, visual verification) have findings or explicit no-divergence entries.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/audits/2026-06-02-parity-audit-findings.md
git commit -m "docs(parity): parity audit findings report"
```

### Task 12: Quality gate + PR

- [ ] **Step 1: Full gate from the root**

```bash
pnpm format
pnpm quality
pnpm exec turbo run test --filter=@perimeter/parity --filter=@perimeter/vite-plugin-widget --force
```

Expected: all pass, with the `--force` run proving the new tests actually execute (turbo cache replays can mask this).

- [ ] **Step 2: Push + PR into dev.** Write the PR body to a temp file with the Write tool (summary, the findings-report headline, harness usage: `pnpm parity:css`, `pnpm parity:components`, `pnpm --filter @perimeter/parity visual`), then:

```bash
git push -u origin feat/parity-audit
gh pr create --base dev --title "feat(parity): parity audit harness + findings (phase 1)" --body-file /tmp/parity-pr-body.md
```

- [ ] **Step 3: Hand the findings report to the user** — they set the Phase 2 fix bar from it (the spec's user review gate). Do not start Phase 2 planning until they respond.

---

## Execution notes

- Run via workflow/multi-agent per user preference; tasks 2–5 are sequential (each builds on the last); tasks 6–9 depend on 1–3 but 8 and 9 are independent of 7 after 6 lands.
- The harness is expected to **report divergences, not fail on them** — Phase 1 measures; Phase 2 fixes and may then promote the CSS differ into a hard regression test.
- If sermons' live-API variance makes its visual diff unreadable, rerun once; if still noisy, lean on the `example` widget for pixel evidence and the CSS reports for sermons — note it in the findings.
