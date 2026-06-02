# Studio Overhaul Phase 2 — Parity Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every divergence in the user-approved Phase 2 fix bar — H2 (ui classes missing from shipped bundles), H1 (rem in studio vs px in prod), H3 (light-DOM component gallery), H6 (studio config bypasses zod), H4 (host-page-sim canvas) — promote the CSS differ into a permanent regression gate, and release the fixed bundles (`example@0.0.1`, `sermons@1.0.2`).

**Architecture:** Centralize the widget Tailwind `content` in `@perimeter/theme` so shipped bundles scan `packages/ui/src` (H2); give the studio the same `remToPxPlugin` pipeline as `widgetConfig()` (H1); re-validate merged config with `schema.parse` inside `mount()` (H6); mount the component gallery into a shadow root through the real `applyStyles` (H3, `ComponentStage`); wrap the studio preview in a `HostFrame` whose values come from a new `hostProfile` export in `@perimeter/theme`, mechanically synced to the audit fixture (H4). The parity differ then asserts **zero** divergence as a permanent test.

**Tech Stack:** Same as Phase 1. Inputs: the findings report `docs/superpowers/audits/2026-06-02-parity-audit-findings.md` (on the execution branch via PR #77), spec `docs/superpowers/specs/2026-06-02-studio-design-system-dx-overhaul-design.md` and this plan (on branch `docs/studio-dx-overhaul-spec` / PR #78 — **NOT present on the execution branch**; the controller provides copies under `/tmp`), Phase 1 harness in `packages/parity` (PR #77).

**Package names for turbo filters (verified):** example = `@perimeter/widget-example`, sermons = `@perimeter/widget-sermons`. A wrong `--filter` matches nothing and turbo SILENTLY runs zero tasks — never use the directory names with turbo. (`pnpm parity:css example sermons` is the opposite: it takes directory names. Don't "fix" either to match the other.)

---

## Context for a zero-context engineer

Read the findings report first — it is the requirements document for this plan. Mechanism summary:

- **H2:** each widget's `tailwind.config.ts` has `content: ['./src/**/*.{ts,tsx}']`. Classes used only inside `@perimeter/ui` source are purged from the shipped CSS (244 selectors missing for `example`, 145 for `sermons`). The studio's own Tailwind also scans `../packages/ui/src`, so the studio looks right. Relative `content` globs resolve against **cwd**, which is the widget dir during builds — that's why `./src` works and why `../../packages/ui/src` will too.
- **H1:** `widgetConfig()` (packages/vite-plugin-widget/src/config.ts) injects `remToPxPlugin` (now exported) into the prod PostCSS chain. The studio's pipeline (`studio/postcss.config.js`: tailwindcss + autoprefixer) lacks it.
- **H6:** `mount()` (packages/widget-runtime/src/mount.tsx:49-52) merges `extras.configOverrides` AFTER `parseDataAttrs`/`schema.parse` with no re-validation. The studio's ConfigPanel emits raw strings into that seam (studio/src/components/ConfigPanel.tsx:69), so zod coercion/validation never runs on studio-entered config.
- **H3:** `ComponentPreview` (studio/src/components/ComponentPreview.tsx) renders `@perimeter/ui` exports into the light DOM with studio Tailwind and an inline token style — no shadow root, no `applyStyles`, no `rewriteRootToHost`.
- **H4:** all four inheritable properties pierce the shadow root. Live perimeter.org values (measured 2026-06-02, recorded in `packages/parity/fixtures/wordpress.html`): html 16px; body 19px / `sweet-sans-pro, "Helvetica Neue", Arial, sans-serif` / `#353535` / line-height 35px / background #fff; content frame max-width 1425px with 90px side padding.

Repo rules: pnpm only; never commit to dev/main; conventional commits; `pnpm format` before `pnpm quality`; verify CI-bound tests with `pnpm exec turbo run test --filter=<pkg> --force`; PR bodies via Write tool + `gh pr create --body-file`; never push except where a task explicitly authorizes it.

**Branch/stacking:** Phase 2 builds on PR #77 (`feat/parity-audit`). Task 1 handles both cases (merged or not). If stacking is needed, PR base = `feat/parity-audit` and the PR body must note the merge order (#77 first) per the land-stacked-prs convention.

---

## Chunk 1: CSS pipeline fixes (H2 + H1) and the permanent regression gate

### Task 1: Branch setup

- [ ] **Step 1:** `git fetch --prune`. Check whether #77 landed: `git log --oneline origin/dev | head -3` — if the parity-audit commits are on origin/dev, run `git checkout -B feat/parity-fixes origin/dev`. Otherwise `git checkout -B feat/parity-fixes feat/parity-audit` (stacked; remember for Task 10's PR base).
- [ ] **Step 2:** Sanity: `ls packages/parity/src` shows `pipelines.ts`, `diff.ts` etc.; `pnpm exec turbo run test --filter=@perimeter/parity --force` is green before any change.

### Task 2: H2 — shared widget Tailwind `content` in `@perimeter/theme`

**Files:**
- Modify: `packages/theme/src/tailwind.ts` (add `widgetContent` export)
- Test: `packages/theme/tests/` (match the existing test file pattern there — read one first)
- Modify: `widgets/example/tailwind.config.ts`, `widgets/sermons/tailwind.config.ts`
- Test (verification): `packages/parity` pipelines

- [ ] **Step 1: Write the failing test** (in theme's test dir):

```ts
import { describe, expect, it } from 'vitest';
import { widgetContent } from '../src/tailwind';

describe('widgetContent', () => {
  it('scans the widget source and every shared UI source a widget can render', () => {
    expect(widgetContent).toContain('./src/**/*.{ts,tsx}');
    expect(widgetContent).toContain('../../packages/ui/src/**/*.{ts,tsx}');
  });
});
```

- [ ] **Step 2: Run to verify failure:** `pnpm exec turbo run test --filter=@perimeter/theme --force` → FAIL (no export).
- [ ] **Step 3: Implement** in `packages/theme/src/tailwind.ts`:

```ts
/**
 * Tailwind `content` globs for a widget build. Relative globs resolve against
 * cwd, which is the widget directory during `vite build` — identical mechanism
 * to the original './src' glob. MUST include every workspace package whose
 * components a widget can render: classes used only inside that source are
 * otherwise purged from the shipped bundle (parity finding H2, 2026-06-02).
 */
export const widgetContent: string[] = [
  './src/**/*.{ts,tsx}',
  '../../packages/ui/src/**/*.{ts,tsx}',
];
```

- [ ] **Step 4:** Point both widgets at it. Each `widgets/*/tailwind.config.ts` becomes:

```ts
import type { Config } from 'tailwindcss';
import preset from '@perimeter/theme/tailwind';
import { widgetContent } from '@perimeter/theme/tailwind';

const config: Config = { presets: [preset], content: widgetContent };
export default config;
```

(Single import statement is fine too: `import preset, { widgetContent } from '@perimeter/theme/tailwind';` — match repo style.)

- [ ] **Step 5: Verify H2 is actually fixed at the pipeline level.** Update `packages/parity/tests/pipelines.test.ts`: the prod-pipeline test currently carries a multi-line comment explaining why `--color-` is ABSENT from prod and must not be asserted — that entire comment block is now false and must be **deleted and replaced** (e.g. "widget content scans packages/ui/src since the H2 fix, so ui color utilities ship"). Change the prod test to ALSO assert `expect(css).toContain('var(--color-')` (the dev test keeps its assertions). Run `pnpm exec turbo run test --filter=@perimeter/parity --filter=@perimeter/theme --force` → PASS.
- [ ] **Step 6: Verify the shipped artifact.** `pnpm --filter ./widgets/example build && pnpm --filter ./widgets/sermons build` → green; then `pnpm parity:css example sermons` (directory names — correct for this script) and confirm both reports now show **"…attributable to @perimeter/ui (H2): 0"**. Also run the sermons bundle-budget test: `pnpm exec turbo run test --filter=@perimeter/widget-sermons --force` → the gz size must stay **< 900 KiB** (baseline ~859 KiB; the added CSS is small — record the new number).
- [ ] **Step 7: Commit** — `git add packages/theme widgets packages/parity && git commit -m "fix(theme): widgets must scan shared ui source — shipped bundles were missing @perimeter/ui classes (H2)"`

### Task 3: H1 — rem→px in the studio pipeline

**Files:**
- Modify: `studio/vite.config.ts` (inline PostCSS with the real plugin)
- Delete: `studio/postcss.config.js`
- Modify: `packages/parity/src/pipelines.ts` (`compileDevCss` mirrors the new studio pipeline)
- Modify: `packages/parity/tests/pipelines.test.ts`
- Modify: `studio/package.json` (add `@perimeter/vite-plugin-widget` workspace dep)

- [ ] **Step 1: Update the dev-pipeline test FIRST** (it defines the new contract): in `pipelines.test.ts`, the dev test's `.p-4` expectation flips from `padding:\s*1rem` to `padding:\s*16px`, and add `expect(css).not.toMatch(/[\d.]rem\b/)`. Keep `var(--color-`. Run → FAIL (still rem).
- [ ] **Step 2: Implement.** In `studio/vite.config.ts`, move PostCSS inline (this is how `widgetConfig()` itself does it — when `css.postcss` is inline, Vite skips `postcss.config.js` discovery entirely):

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { remToPxPlugin } from '@perimeter/vite-plugin-widget';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [react()],
  // Same PostCSS chain a shipped widget gets (rem→px is the prod transform —
  // parity finding H1): with css.postcss inline, postcss.config.js is ignored,
  // so it is deleted to leave exactly one source of truth.
  css: { postcss: { plugins: [tailwindcss(), autoprefixer(), remToPxPlugin] } },
  server: { fs: { allow: [workspaceRoot] } },
});
```

Delete `studio/postcss.config.js`. Add `"@perimeter/vite-plugin-widget": "workspace:*"` to studio devDependencies (+ `tailwindcss`/`autoprefixer` are already there); `pnpm install`. Note: argless `tailwindcss()` resolves `tailwind.config.ts` from cwd — the studio dev server runs with cwd `studio/`, which is correct; verify by Step 4's manual smoke.
- [ ] **Step 3: Mirror in the harness.** In `packages/parity/src/pipelines.ts`, add `remToPxPlugin` to `compileDevCss`'s chain (and to the component-dev compile added in Phase 1 Task 9, `compileComponentDevCss`, if present — read the file) with a comment citing H1. The dev pipeline definition must always equal what the studio actually runs.
- [ ] **Step 4: Verify.** `pnpm exec turbo run test --filter=@perimeter/parity --force` → PASS. Manual smoke: `pnpm --filter @perimeter/studio dev`, open http://localhost:5173, inspect any padded element — computed padding must be a px-derived value with **no rem anywhere in the inspector's matched rules**. Then `pnpm parity:css example sermons` → both reports show **"value diffs, rem→px (H1): 0"** and **"value diffs, other: 0"**.
- [ ] **Step 5: Commit** — `git add studio packages/parity pnpm-lock.yaml && git commit -m "fix(studio): apply the prod rem→px transform in the studio pipeline (H1)"`

### Task 4: Promote the differ to a permanent regression gate

**Files:**
- Create: `packages/parity/src/ui-selectors.ts` (move the ui-attribution helper out of the report script)
- Modify: `packages/parity/src/report-css.ts` (reuse the helper)
- Create: `packages/parity/tests/regression.test.ts`

- [ ] **Step 1: Extract the helper.** Move the `uiSelectors` extraction logic from `report-css.ts` into `src/ui-selectors.ts` as `export async function uiAttributableSelectors(devOnly: string[]): Promise<string[]>` (compiles ui-only CSS once, caches per process, matches the `' :: '`-suffix rule). `report-css.ts` imports it. Behavior identical — re-run `pnpm parity:css example` and confirm the report numbers are unchanged vs Task 3's run.
- [ ] **Step 2: Write the regression test** — discovery-driven, never a hard-coded widget list:

```ts
import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { compileDevCss, compileProdCss, repoRoot } from '../src/pipelines.ts';
import { diffCss } from '../src/diff.ts';
import { uiAttributableSelectors } from '../src/ui-selectors.ts';

const widgets = readdirSync(path.join(repoRoot, 'widgets')).filter((n) =>
  existsSync(path.join(repoRoot, 'widgets', n, 'tailwind.config.ts')),
);

describe('css pipeline parity (permanent gate — see audits/2026-06-02-parity-audit-findings.md)', () => {
  it('found at least the known widgets', () => {
    expect(widgets).toEqual(expect.arrayContaining(['example', 'sermons']));
  });

  it.each(widgets)('%s: shipped CSS diverges from studio CSS in zero meaningful ways', async (name) => {
    const dir = path.join(repoRoot, 'widgets', name);
    const [dev, prod] = await Promise.all([compileDevCss(dir), compileProdCss(dir)]);
    const d = diffCss(dev, prod);
    // H2: no @perimeter/ui class may be missing from the shipped bundle.
    expect(await uiAttributableSelectors(d.onlyInA)).toEqual([]);
    // H1: studio and prod both run rem→px now — zero unit drift, zero other value drift.
    expect(d.valueDiffs).toEqual([]);
    // The shipped bundle must never contain rules the studio doesn't render.
    expect(d.onlyInB).toEqual([]);
    // NOT asserted: d.onlyInA == [] — dev is a legitimate superset (studio chrome,
    // other widgets' classes); H2-attribution is the meaningful subset gate.
  }, 120_000);
});
```

- [ ] **Step 3: Run** `pnpm exec turbo run test --filter=@perimeter/parity --force` → PASS (Tasks 2+3 made the assertions true). Then prove the gate bites: temporarily revert one widget's `content` to `['./src/**/*.{ts,tsx}']`, run again → the H2 assertion must FAIL listing real selectors; restore.
- [ ] **Step 4: Commit** — `git add packages/parity && git commit -m "test(parity): css pipeline diff is now a permanent zero-divergence gate"`

---

## Chunk 2: Runtime fixes — H6 config validation + H3 ComponentStage

### Task 5: H6 — `mount()` re-validates merged config

**Files:**
- Modify: `packages/widget-runtime/src/mount.tsx:47-52`
- Modify: `packages/widget-runtime/src/data-attrs.ts` (export the `"true"/"false"` shorthand normalizer)
- Test: `packages/widget-runtime/tests/mount.test.tsx` (read it first; add cases beside the existing ones)
- Modify: `studio/src/components/WidgetPreview.tsx` (surface mount errors instead of white-screening)
- Test: `studio/src/components/render.test.tsx`

- [ ] **Step 1: Failing tests** (widget-runtime). Add to the existing mount test file, matching its setup helpers:

```ts
it('coerces string configOverrides through the schema (studio ConfigPanel parity)', () => {
  // schema with z.coerce.number(); pass configOverrides: { count: '5' } (a raw string)
  // assert the rendered App received config.count === 5 (number)
});

it('rejects configOverrides the schema rejects — same gate as data-* in prod', () => {
  // schema with .max(20); pass configOverrides: { count: 99 }
  // assert mount() throws ZodError (synchronously)
});

it('applies the "true"/"false" shorthand to string overrides — z.coerce.boolean alone is a trap', () => {
  // schema with z.coerce.boolean() field; pass configOverrides: { hidden: 'false' } (raw string,
  // as ConfigPanel emits). MUST resolve to boolean false. NOTE the trap this guards:
  // z.coerce.boolean()('false') === true (Boolean('false')), so re-validation alone is NOT
  // enough — the same data-attrs.ts shorthand that prod applies must run on string overrides.
});

it('prod path unchanged: no overrides → config identical to parseDataAttrs result', () => {
  // mount with data-count="6" on the host, no extras → config.count === 6
});
```

Write them as real tests against the file's existing harness (it already mounts fixtures with schemas — mirror that pattern). Run `pnpm exec turbo run test --filter=@perimeter/widget-runtime --force` → the first two FAIL.
- [ ] **Step 2: Implement.** First, in `data-attrs.ts`, extract the existing `"true"/"false"`→bool conversion (line ~31) into an exported helper (e.g. `export function applyBoolShorthand(value: unknown): unknown` — returns the boolean for the exact strings `'true'`/`'false'`, the value untouched otherwise) and use it in the existing attr loop (behavior unchanged — existing data-attrs tests must stay green). Then in `mount.tsx` replace lines 49-52:

```ts
  const overrides = Object.fromEntries(
    Object.entries(extras.configOverrides ?? {}).map(([k, v]) => [k, applyBoolShorthand(v)]),
  );
  const mergedConfig: Record<string, unknown> = definition.schema.parse({
    ...(parsed.config as Record<string, unknown>),
    ...overrides,
  }) as Record<string, unknown>;
```

Intent: overrides now pass the exact gates `data-*` attrs pass in prod — the bool shorthand (which zod CANNOT replicate: `z.coerce.boolean()('false') === true`) and then full coercion/bounds/refinements. kebab→camel is N/A (overrides are already camelCase). With no overrides this re-parses the already-parsed config — idempotent for this repo's schemas (the prod-path test proves it). This closes all of H6, not just the zod gap.
- [ ] **Step 3:** Run widget-runtime tests → PASS. Also run the dependents' suites: `pnpm exec turbo run test --filter=...@perimeter/widget-runtime --force` — note the dots are LEADING (`...pkg` = package + dependents: studio, widget-example, widget-sermons, api-hooks, ui). Trailing dots (`pkg...`) select dependencies instead and would silently skip exactly the sermons-refine-schema coverage this step exists to run. Verify the turbo output lists `@perimeter/widget-sermons` and `@perimeter/studio` among the executed packages.
- [ ] **Step 4: Studio error surface.** A throwing `mount()` now reaches the studio whenever ConfigPanel input is invalid — that's parity-correct but must not white-screen. In `WidgetPreview.tsx`, wrap the `mount(...)` call (effect at line ~39) in try/catch; on error, store it in state and render a visible error box (message + which field, from `ZodError.issues` if available) in place of the preview; clear on next successful mount. Add a render.test.tsx case: mount a widget whose schema is `z.object({ n: z.coerce.number().max(5) })` with `configOverrides: { n: '99' }` via the studio component → assert the error box text appears and no throw escapes.
- [ ] **Step 5:** Add one more render.test.tsx case driving a `z.coerce.boolean()` field through the studio path with the string `'false'` → the App must receive `false` (guards the shorthand end-to-end through WidgetPreview). `pnpm exec turbo run test --filter=@perimeter/studio --force` → PASS. Manual smoke: studio, example widget, type `999` into `count` (schema max 20) → inline error appears; type `5` → preview recovers.
- [ ] **Step 6: Commit** — `git add packages/widget-runtime studio && git commit -m "fix(widget-runtime): re-validate merged config through the schema — studio no longer bypasses zod (H6)"`

### Task 6: H3 — `ComponentStage`: the gallery renders inside the widget pipeline

**Files:**
- Create: `studio/src/components/ComponentStage.tsx`
- Create: `studio/src/stage.css` (`@tailwind base; @tailwind components; @tailwind utilities;`)
- Modify: `studio/src/components/ComponentPreview.tsx`
- Test: `studio/src/components/render.test.tsx`

- [ ] **Step 1: Failing test** in render.test.tsx:

```ts
it('ComponentStage renders children inside a shadow root with widget styling applied', async () => {
  // render(<ComponentStage><button className="p-4">x</button></ComponentStage>)
  // await the portal mount, then:
  // - the stage host element has a shadowRoot
  // - countAppliedSheets(shadowRoot) === 2  (widget sheet + token sheet)
  // - the button is inside the shadow root, NOT in the light DOM under the host
  // NOTE: countAppliedSheets, applyStyles, and StyleHandle are all currently
  // module-private to widget-runtime — Step 2 exports all three together.
});
```

(happy-dom supports `attachShadow` + `adoptedStyleSheets` — that's why the studio tests run under it.) Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → FAIL.
- [ ] **Step 2: Implement `ComponentStage.tsx`:**

```tsx
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { resolveTokens } from '@perimeter/theme';
import { applyStyles, type StyleHandle } from '@perimeter/widget-runtime';
import stageCss from '../stage.css?inline';

/**
 * Mounts gallery content inside a shadow root through the SAME styling path a
 * shipped widget uses (applyStyles: rewriteRootToHost + widget sheet + token
 * sheet) with CSS from the same studio pipeline (now rem→px, H1). Kills the
 * light-DOM gallery divergence (parity finding H3).
 */
export function ComponentStage({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
    const styles: StyleHandle = applyStyles(
      shadow,
      'studio-component-stage',
      stageCss,
      resolveTokens({}).cssText,
    );
    const root = document.createElement('div');
    shadow.appendChild(root);
    setContainer(root);
    return () => {
      styles.dispose();
      setContainer(null);
    };
  }, []);

  return <div ref={hostRef}>{container ? createPortal(children, container) : null}</div>;
}
```

Prerequisite (verified): `applyStyles`, `StyleHandle`, and `countAppliedSheets` are **not** currently exported from `packages/widget-runtime/src/index.ts` (only `clearAll`/`clearStyleCache` are). Export all three in one line alongside the existing styling exports and note it in the commit — `applyStyles` is the styling seam the spec's ComponentStage was designed around; `countAppliedSheets` is needed by the Step 1 test.
- [ ] **Step 3:** `ComponentPreview` wraps its component list in `<ComponentStage>` (the `Isolate` error boundaries stay, now inside the stage; the inline `tokenStyle` wrapper div is deleted — tokens now arrive via the token sheet exactly like a widget). Run tests → PASS, including the pre-existing ComponentPreview guards.
- [ ] **Step 4: Manual smoke:** studio → pick `button`, `card`, `tabs` — components render styled inside a shadow root (inspect: `#shadow-root` under the stage host; token vars on `:host`).
- [ ] **Step 5: Commit** — `git add studio && git commit -m "fix(studio): component gallery renders in a shadow root through the widget styling path (H3)"`

---

## Chunk 3: H4 host-page sim, production releases, PR

### Task 7: H4 — `hostProfile` in theme + `HostFrame` in the studio

**Files:**
- Create: `packages/theme/src/host-profile.ts`; export from `packages/theme/src/index.ts`
- Test: `packages/theme/tests/` (sync test) + `packages/parity/tests/fixture-sync.test.ts`
- Create: `studio/src/components/HostFrame.tsx`
- Modify: `studio/src/App.tsx` (wrap the widget preview)
- Test: `studio/src/components/render.test.tsx`

- [ ] **Step 1: `host-profile.ts`** — the measured production host environment, single typed source of truth:

```ts
/**
 * Measured production host-page environment (perimeter.org WordPress page).
 * Source of truth shared by the studio's HostFrame and the parity audit
 * fixture (packages/parity/fixtures/wordpress.html) — a parity test asserts
 * the fixture matches these values, so they cannot drift apart.
 * Measured 2026-06-02 via headless Chromium getComputedStyle.
 */
export const hostProfile = {
  rootFontSize: '16px',
  bodyFontFamily: 'sweet-sans-pro, "Helvetica Neue", Arial, sans-serif',
  bodyFontSize: '19px',
  bodyLineHeight: '35px',
  bodyColor: '#353535',
  bodyBackground: '#ffffff',
  contentMaxWidth: '1425px',
  contentPaddingX: '90px',
} as const;
```

- [ ] **Step 2: Sync test** in `packages/parity/tests/fixture-sync.test.ts`: read `fixtures/wordpress.html` as text and assert it contains each `hostProfile` value (`font-size: 19px`, `line-height: 35px`, `#353535`, `1425px`, `90px`, …). **Known formatting trap:** the fixture's font-family uses single quotes (`'sweet-sans-pro', 'Helvetica Neue', …`) while `hostProfile.bodyFontFamily` uses CSS-canonical double quotes — do NOT assert the literal hostProfile string for font-family; assert quote-agnostic fragments (`sweet-sans-pro`, `Helvetica Neue`, `Arial, sans-serif`) instead. If a *value* mismatches, the fix is to update **both** from a fresh measurement, never one side. PASS.
- [ ] **Step 3: `HostFrame.tsx`:**

```tsx
import type { ReactNode } from 'react';
import { hostProfile } from '@perimeter/theme';

/**
 * Replicates the production host page around a widget preview: the inheritable
 * properties that pierce the shadow root (parity finding H4 — all four probed
 * properties inherit) plus the real content-frame width. Values from
 * hostProfile (single source of truth with the audit fixture).
 * Phase 3 adds the canvas toggle; in Phase 2 this is the default-and-only canvas.
 */
export function HostFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-host-frame
      style={{
        fontFamily: hostProfile.bodyFontFamily,
        fontSize: hostProfile.bodyFontSize,
        lineHeight: hostProfile.bodyLineHeight,
        color: hostProfile.bodyColor,
        background: hostProfile.bodyBackground,
      }}
    >
      <div
        style={{
          maxWidth: hostProfile.contentMaxWidth,
          margin: '0 auto',
          padding: `0 ${hostProfile.contentPaddingX}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** In `App.tsx`, wrap `<WidgetPreview …/>` in `<HostFrame>` (the embed-snippet `<pre>` stays outside). Render test: the widget preview host's ancestor chain includes `[data-host-frame]` with `font-size: 19px` style. Run studio tests → PASS.
- [ ] **Step 5: Manual smoke:** studio → example widget text now renders at the host's 19px/35px rhythm (visibly larger/looser than before — that's production truth). Compare against the Phase 1 diff images if in doubt.
- [ ] **Step 6: Commit** — `git add packages/theme packages/parity studio && git commit -m "feat(studio): host-page-sim canvas from a shared hostProfile (H4)"`

### Task 8: Release the fixed bundles

The H2 fix only reaches widgets.perimeter.org through released bundles. Versions: `example` 0.0.0→**0.0.1**, `sermons` 1.0.1→**1.0.2**.

- [ ] **Step 1:** Edit `widgets/example/package.json` version to `0.0.1` and `widgets/sermons/package.json` to `1.0.2`.
- [ ] **Step 2:** `pnpm release example` then `pnpm release sermons` — each builds, copies to `cdn/<name>/<version>/`, updates `manifest.json` + rewrites, prunes to 5, and commits (`chore(release): …`). Verify: `git log --oneline -2` shows both release commits; `cat cdn/manifest.json` points at `0.0.1`/`1.0.2`; `ls cdn/sermons` has the new version dir.
- [ ] **Step 3:** Confirm the released bundle gained the compiled ui CSS. **Do NOT grep a bare class name** like `border-ring` — the JSX `className` string literals ship in the bundled JS whether or not the CSS rule was generated (`grep -c 'border-ring' cdn/sermons/1.0.1/index.js` is already 3 today), so a class name proves nothing. Grep a token that exists ONLY in compiled Tailwind CSS:

```bash
grep -c -- '--tw-ring-color' cdn/sermons/1.0.1/index.js   # expected: 0 (the H2 bug)
grep -c -- '--tw-ring-color' cdn/sermons/1.0.2/index.js   # expected: nonzero (the fix, shipped)
```

This is the production-truth proof of the fix; quote both numbers in the PR body.

### Task 9: Visual confirmation (one-shot, no commit)

- [ ] **Step 1:** `pnpm --filter @perimeter/parity visual` (servers auto-start). Read `reports/visual-example.md` + diff image: with H1/H2/H4 fixed and the HostFrame applied, the studio and fixture renders should now align in styling — residual diff should be width-crop offset only (the studio center column is still narrower than 1100px; Phase 3's viewport presets address canvas width). Record the new example mismatch % in your report-back; if styling STILL visibly diverges (cards unstyled, fonts off), STOP — something in Tasks 2–7 didn't take; investigate before the PR.

### Task 10: Quality gate + PR

- [ ] **Step 1:** `pnpm format` then `pnpm quality` then `pnpm exec turbo run test --filter=@perimeter/parity --filter=@perimeter/theme --filter=@perimeter/widget-runtime --filter=@perimeter/studio --filter=@perimeter/widget-example --filter=@perimeter/widget-sermons --force` → all green (the widget filters force a genuine re-run of the bundle-budget tests — cache replays don't count).
- [ ] **Step 2:** Push and open the PR with the Write tool + `--body-file`: title `fix(widgets): dev/prod parity fixes — ship ui classes, studio rem→px, validated config, shadow gallery, host-sim canvas (phase 2)`. Base: `dev` if Task 1 branched from origin/dev; otherwise base `feat/parity-audit` with a "merge #77 first" note (land-stacked-prs). Body: the five H-fixes with one-line mechanisms, the regression gate, the `example@0.0.1`/`sermons@1.0.2` releases, and the grep-proof from Task 8 Step 3. Do NOT merge.
- [ ] **Step 3:** Report back to the controller: PR URL, new bundle sizes, new visual mismatch %, anything DONE_WITH_CONCERNS.

---

## Execution notes

- Tasks are strictly sequential (shared working tree; later tasks assert on earlier tasks' effects).
- The regression test (Task 4) is the phase's contract: after this plan, **any** reintroduced pipeline divergence fails CI.
- Out of scope (deferred per spec): studio UI redesign/toolbar + canvas toggle + built-bundle preview (Phase 3), MDX docs/site/deploy (Phase 3), scaffolder/release DX (Phase 4), docs rewrite + skill (Phase 5). H5 and the H6 sub-findings are document-only and land with Phase 5's docs; the findings report already records them.
