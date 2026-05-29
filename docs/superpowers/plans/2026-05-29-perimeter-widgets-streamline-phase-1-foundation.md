# Perimeter Widgets Streamline — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the widget platform on a single mount path with a fast Vite studio, so a developer (or Claude) can build a widget with live HMR and dev-renders-exactly-like-prod, with no dual-render machinery and no build-time CSS codegen.

**Architecture:** Keep the Turborepo workspace and the package decomposition. Rebuild the *platform mechanics*: one `mount(host, definition, css, overrides?)` function used by both the production IIFE and the dev studio; CSS imported as a `?inline` string and injected into the shadow root via a shared `CSSStyleSheet` (`adoptedStyleSheets`); a simplified `@perimeter/vite-plugin-widget` that exposes a `widgetConfig({ name })` Vite-config helper plus an explicit per-widget `src/entry.ts` (no virtual-entry codegen, no CSS placeholder substitution). Replace the Next.js `apps/studio` with a Vite `studio/` app that auto-discovers widgets and UI components via `import.meta.glob` and previews them through the real `mount()`. Delete `@perimeter/release-store` and `apps/cdn` (their replacement is Phase 3). The auth, api-client, and ui packages carry over essentially unchanged.

**Tech Stack:** pnpm workspaces + Turborepo, Vite 6, React 19, TypeScript 5.7 (strict, `exactOptionalPropertyTypes`), Tailwind v3, Zod 3, Vitest + Testing Library + jsdom, Vercel (later phases).

**Scope:** Phase 1 only — platform packages + Vite studio + the `example` widget, `pnpm quality` green, **no production change**. The sermons port is Phase 2; hosting/release is Phase 3; cutover is Phase 4. Each gets its own plan.

**Spec:** `docs/superpowers/specs/2026-05-29-perimeter-widgets-streamline-redesign-design.md`

---

## Key decisions locked for this plan

These resolve ambiguities the spec left to planning. They are intentional and the reviewer should treat them as settled unless they are internally contradictory:

1. **Execution branch:** `feat/widgets-streamline-foundation`, cut from `origin/dev`. Never commit to `dev`/`main`; land via PR. The current platform code is already preserved on the `legacy/v1` branch and on `dev`, so this plan *transforms the working tree in place* on the feature branch rather than literally deleting and retyping carried-over files — the end-state shape matches the spec's "fresh scaffold," and nothing is lost because git history holds the old tree.
2. **`mount()` signature:** `mount(host: HTMLElement, definition: WidgetDefinition, css: string, overrides?: MountExtras): MountedWidget`. The old `mountWidget({ definition, target, ... })` name is **removed**. `MountExtras` carries the optional `configOverrides`, `apiBaseUrl`, and `authFactory` that the old options object held.
3. **CSS path:** widgets `import css from './styles.css?inline'` in `src/entry.ts` and pass the string to `autoMount(definition, css)`. This single string is the CSS source for **both** dev (studio) and prod (IIFE). The build-time `CSS_PLACEHOLDER` substitution and `registerCss`/`getCss` global registry are **removed**.
4. **Shadow-root styling:** a single `styling.ts` module owns CSS injection. It **feature-detects** constructable stylesheets: when `adoptedStyleSheets` + `CSSStyleSheet.replaceSync` are available (all modern browsers, happy-dom) it adopts a **shared** widget-CSS sheet (one `CSSStyleSheet` per widget name, parsed once, shared across instances) plus a **per-instance** token sheet (`:host { --token: … }`) the studio can live-update; when they are absent (older Safari) it falls back to two injected `<style>` elements. A defensive `:root`→`:host` rewrite is applied to the widget CSS first. `mount()` calls `styling.ts`; it never touches `adoptedStyleSheets` directly.
5. **Test DOM environment:** the `widget-runtime` package's Vitest environment is **happy-dom** (not jsdom), because jsdom 25/26 do **not** implement `CSSStyleSheet.replaceSync` or `ShadowRoot.adoptedStyleSheets`. happy-dom implements both, so the tests exercise the real modern styling path. Other packages keep jsdom (they don't touch constructable stylesheets). Test assertions use a `countAppliedSheets(shadow)` helper that works in either styling mode, and avoid deep `cssRules` text introspection (which DOM impls render inconsistently).
6. **px scale:** `widgetConfig` adds a tiny **inline PostCSS plugin** (no external dependency) that converts `rem` lengths to `px` at a 16px base, so Tailwind's `rem`-based sizes are immune to a host page's `html { font-size }`. Radius tokens in `@perimeter/theme` move from `rem` to `px`. (Tailwind v4 / `@property` hoisting is **out of scope** for Phase 1 — we stay on v3; v4 is a future option noted in the spec.)
7. **Version injection:** `widgetConfig` injects `define: { __PERIMETER_WIDGET_VERSION__: JSON.stringify(pkg.version) }`; `src/entry.ts` sets `definition.version = __PERIMETER_WIDGET_VERSION__` before `autoMount`. No virtual entry.
8. **Studio discovery:** `import.meta.glob('/widgets/*/src/widget.tsx')` for widgets and `import.meta.glob('/packages/ui/src/*.tsx')` for components, with Vite `server.fs.allow` set to the workspace root. No hand-edited registry.
9. **Widget source split:** each widget's `defineWidget(...)` default export moves to `src/widget.tsx` (importable by the studio with no CSS side-effects); the CSS-importing IIFE bootstrap lives in `src/entry.ts` (built by Vite). The studio imports `widget.tsx`; Vite builds `entry.ts`.
11. **Test-file convention (existing, must be followed):** every package keeps its tests in a `tests/` directory and imports sources via `../src/…`; each has a `vitest.config.ts` with `include: ['tests/**/*.test.{ts,tsx}']`. **New tests go in `tests/`, not colocated in `src/`.** Existing tests for code this plan changes are **rewritten in place**; existing tests for code this plan deletes are **removed** (`widget-runtime/tests/{mount,auto-mount,global,registry}` reference removed symbols; `vite-plugin-widget/tests/{plugin,virtual-entry}.test.ts` test deleted modules; `widget-runtime`'s `tests/setup.ts` + jest-dom + the `--no-experimental-webstorage` poolOptions are kept). The only `vitest.config.ts` change is flipping `widget-runtime`'s `environment` to `happy-dom`.
12. **Sermons is set aside in Phase 1.** `widgets/sermons` depends on the old platform API (`perimeterWidget` plugin, `mountWidget`, `@perimeter/api-types`, `src/index.tsx` CSS side-effect) and is **not** ported until Phase 2. To keep `pnpm quality` green, Phase 1 **removes `widgets/sermons` from the pnpm workspace** (the `widgets/*` glob becomes `widgets/example`). The sermons source stays in the tree untouched (preserved by git + the `legacy/v1` branch); Phase 2 re-adds it to the workspace and ports it. Because it is out of the workspace, Turborepo never builds/typechecks it and its now-dangling `@perimeter/api-types` import does not fail the gate; `prettier --check` still formats it harmlessly.

---

## File structure (end state of Phase 1)

```
perimeter-widgets/
├── package.json                      # MODIFY: drop publish-widget script; add studio to dev
├── pnpm-workspace.yaml               # MODIFY: 'studio' replaces 'apps/*'
├── turbo.json                        # unchanged (narrow pipeline already correct)
├── packages/
│   ├── theme/                        # MODIFY: px radius tokens; add :root→:host + sheet helpers
│   │   └── src/{tokens.ts,resolver.ts,tailwind.ts,css.ts(NEW),index.ts}
│   ├── widget-runtime/               # MODIFY: new mount signature, styling module, drop native-render/registry-css
│   │   ├── src/{mount.tsx,auto-mount.ts,data-attrs.ts,styling.ts(NEW),define-widget.ts,
│   │   │        global.ts,index.ts,providers/*,hooks/*}   # DELETE native-render.ts; registry.ts slimmed
│   │   └── vitest.config.ts           # MODIFY: environment 'happy-dom'
│   ├── vite-plugin-widget/           # REWRITE: widgetConfig() helper; delete virtual-entry.ts
│   │   └── src/{config.ts(NEW),index.ts}                  # DELETE plugin.ts, virtual-entry.ts
│   ├── auth/                         # carry over unchanged
│   ├── api-client/                   # carry over unchanged
│   ├── api-hooks/                    # MODIFY: absorb former api-types (operations.ts + codegen scripts)
│   └── ui/                           # carry over unchanged (components + cn + hooks)
├── widgets/
│   ├── example/                      # MODIFY: split widget.tsx / entry.ts; new vite.config; ?inline css
│   │   └── src/{widget.tsx,entry.ts,app.tsx,styles.css,env.d.ts}
│   └── sermons/                      # UNTOUCHED but REMOVED from the pnpm workspace until Phase 2
├── studio/                           # NEW Vite app (replaces apps/studio Next.js)
│   ├── package.json, vite.config.ts, tsconfig.json, index.html, postcss.config.js, tailwind.config.ts
│   └── src/{main.tsx,App.tsx,styles.css,lib/discovery.ts,
│            components/{WidgetPreview.tsx,ComponentPreview.tsx,ThemeEditor.tsx,ConfigPanel.tsx}}
└── docs/…
```

**Deleted in Phase 1:** `packages/release-store/`, `packages/api-types/` (folded into api-hooks), `apps/cdn/`, `apps/studio/` (Next.js), `packages/widget-runtime/src/native-render.ts`, `packages/vite-plugin-widget/src/{plugin.ts,virtual-entry.ts}`.

---

## Chunk 1: Workspace scaffold & teardown

### Task 1.1: Create the feature branch and prune dead workspace members

**Files:**
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (root)
- Delete: `packages/release-store/`, `apps/cdn/`, `apps/studio/`

- [ ] **Step 1: Cut the branch from origin/dev**

```bash
git fetch origin --prune
git checkout -b feat/widgets-streamline-foundation origin/dev
```

- [ ] **Step 2: Delete the release stack and the Next.js apps**

```bash
git rm -r packages/release-store apps/cdn apps/studio
```

- [ ] **Step 3: Update `pnpm-workspace.yaml`** — list `widgets/example` explicitly so `widgets/sermons` (which still uses the old platform API) is out of the workspace until its Phase 2 port:

```yaml
packages:
  - 'studio'
  - 'packages/*'
  - 'widgets/example'
```

(`studio/` does not exist until Chunk 7; pnpm 10 silently ignores a workspace entry that has no `package.json`, so listing it now is harmless and the install in Step 5 succeeds. Task 7.1 re-runs `pnpm install` once `studio/package.json` exists.)

- [ ] **Step 4: Update root `package.json`** — remove the `publish-widget` script (its replacement is the Phase 3 release CLI) and keep everything else:

Remove this line from `scripts`:
```json
"publish-widget": "tsx packages/release-store/scripts/publish-widget.ts"
```

- [ ] **Step 5: Reinstall so the workspace graph drops the removed packages**

Run: `pnpm install`
Expected: completes; lockfile updates; no reference to `@perimeter/release-store`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(widgets): remove release-store + Next.js apps; scope workspace to studio/packages/widgets"
```

> NOTE: `pnpm install`/`build` will fail later in this chunk because `widget-runtime` still imports the to-be-deleted `native-render`/`registry` symbols and `apps/*` are gone from referencing code. That is expected; the workspace is rebuilt package-by-package in the chunks below. Do **not** try to make `pnpm quality` pass until Task 6.x.

---

## Chunk 2: `@perimeter/theme` — px tokens + shadow CSS helpers

### Task 2.1: Move radius tokens to px

**Files:**
- Modify: `packages/theme/src/tokens.ts`
- Modify: `packages/theme/tests/tokens.test.ts` (augment the existing file)

- [ ] **Step 1: Add a failing assertion** to the existing `packages/theme/tests/tokens.test.ts` (which already imports `globalTokens` from `../src/tokens`). Append this `it` inside the existing `describe('globalTokens', …)`:

```ts
  it('uses px (not rem) for radius so host font-size cannot rescale widgets', () => {
    for (const [key, value] of Object.entries(globalTokens)) {
      if (key.startsWith('radius-')) expect(value).toMatch(/px$/);
    }
  });
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec turbo run test --filter=@perimeter/theme`
Expected: FAIL — current radius values end in `rem`. (The existing "every value is a non-empty string" test still passes — px values are non-empty strings.)

- [ ] **Step 3: Convert radius tokens to px** in `packages/theme/src/tokens.ts`:

```ts
  'radius-sm': '4px',
  'radius-md': '8px',
  'radius-lg': '12px',
```

(Leave colors and font tokens unchanged.)

- [ ] **Step 4: Run the test**

Run: `pnpm exec turbo run test --filter=@perimeter/theme`
Expected: PASS (all theme tests, including the existing `tailwind.test.ts` which asserts radius maps to `var(--radius-md)` — unaffected by the rem→px value change).

- [ ] **Step 5: Commit**

```bash
git add packages/theme/src/tokens.ts packages/theme/tests/tokens.test.ts
git commit -m "feat(theme): px-based radius tokens for shadow-DOM font-size immunity"
```

### Task 2.2: Add a shadow-CSS helper (`:root`→`:host` rewrite)

**Files:**
- Create: `packages/theme/src/css.ts`
- Modify: `packages/theme/src/index.ts`
- Test: `packages/theme/tests/css.test.ts` (NEW)

- [ ] **Step 1: Write the failing test**

```ts
// packages/theme/tests/css.test.ts
import { describe, it, expect } from 'vitest';
import { rewriteRootToHost } from '../src/css';

describe('rewriteRootToHost', () => {
  it('rewrites :root selectors to :host so vars resolve inside a shadow root', () => {
    expect(rewriteRootToHost(':root { --x: 1px; }')).toBe(':host { --x: 1px; }');
  });
  it('rewrites :root combined with other selectors', () => {
    expect(rewriteRootToHost(':root, html { color: red; }')).toBe(':host, html { color: red; }');
  });
  it('leaves css without :root untouched', () => {
    expect(rewriteRootToHost('.a { color: red; }')).toBe('.a { color: red; }');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec turbo run test --filter=@perimeter/theme`
Expected: FAIL — `rewriteRootToHost` not exported.

- [ ] **Step 3: Implement `packages/theme/src/css.ts`**

```ts
/**
 * Rewrite `:root` selectors to `:host` so any custom-property declarations
 * Tailwind/preflight emit under `:root` resolve inside a shadow root, where
 * `:root` matches the host document, not the shadow tree.
 */
export function rewriteRootToHost(css: string): string {
  return css.replace(/:root\b/g, ':host');
}
```

- [ ] **Step 4: Export it** — add to `packages/theme/src/index.ts`:

```ts
export { rewriteRootToHost } from './css';
```

- [ ] **Step 5: Run the test**

Run: `pnpm exec turbo run test --filter=@perimeter/theme`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/theme/src packages/theme/tests/css.test.ts
git commit -m "feat(theme): add :root->:host rewrite helper for shadow-root CSS injection"
```

> The resolver (`resolveTokens`) already emits `:host { … }` and needs no change. `tailwind.ts` reads radius tokens generically and needs no change.

---

## Chunk 3: `@perimeter/widget-runtime` — one mount path + shadow styling

### Task 3.0: Switch the runtime test environment to happy-dom

jsdom 25/26 do **not** implement `CSSStyleSheet.replaceSync` or `ShadowRoot.adoptedStyleSheets`; happy-dom does. The styling module and `mount` tests below depend on them, so this package's tests run under happy-dom.

**Files:**
- Modify: `packages/widget-runtime/vitest.config.ts` (flip `environment` only; keep `include`, `setupFiles`, `poolOptions`)
- Modify: `packages/widget-runtime/package.json` (swap `jsdom` → `happy-dom` devDependency)

- [ ] **Step 1:** In `packages/widget-runtime/package.json` `devDependencies`, remove `jsdom` and add `happy-dom` (`^15`). Keep `@testing-library/jest-dom` and `@testing-library/react`. Run `pnpm install`.
- [ ] **Step 2:** In the existing `packages/widget-runtime/vitest.config.ts`, change **only** the environment line from `environment: 'jsdom'` to `environment: 'happy-dom'`. Leave `include: ['tests/**/*.test.{ts,tsx}']`, `setupFiles: ['./tests/setup.ts']`, and the `--no-experimental-webstorage` `poolOptions` exactly as they are (the poolOptions still matter — `MPLocalStorageAuth` touches `localStorage`, and happy-dom provides its own).

> NOTE: this step alone makes the suite RED, because the existing `tests/{mount,auto-mount,global,registry}.*` still import the soon-to-be-removed `mountWidget`/`nativeRender`/`registerCss`/`getCss`. They are rewritten/removed in Tasks 3.1–3.4. Do not try to get this package green until Task 3.4. Commit the config + dep change now; run the suite at the end of Chunk 3.

- [ ] **Step 3: Commit**

```bash
git add packages/widget-runtime/vitest.config.ts packages/widget-runtime/package.json pnpm-lock.yaml
git commit -m "test(runtime): switch test env to happy-dom (constructable stylesheets)"
```

### Task 3.1: Shadow styling module (`styling.ts`) with constructable-sheet + `<style>` fallback

**Files:**
- Create: `packages/widget-runtime/src/styling.ts`
- Test: `packages/widget-runtime/tests/styling.test.ts` (NEW)

One module owns CSS injection. It feature-detects constructable stylesheets and falls back to `<style>` elements (older Safari). The shared widget sheet is parsed once per widget name; the token layer is per-instance and live-updatable.

- [ ] **Step 1: Write the failing test** (assertions avoid `cssRules` text introspection so they hold across DOM impls)

```ts
// packages/widget-runtime/tests/styling.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyStyles, countAppliedSheets, clearStyleCache } from '../src/styling';

beforeEach(() => clearStyleCache());

function shadow(): ShadowRoot {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host.attachShadow({ mode: 'open' });
}

describe('applyStyles', () => {
  it('applies a widget layer + a token layer (2 total)', () => {
    const s = shadow();
    applyStyles(s, 'demo', '.x{color:red}', ':host{--color-primary:red}');
    expect(countAppliedSheets(s)).toBe(2);
  });

  it('reuses one shared widget sheet object across instances', () => {
    const a = shadow();
    const b = shadow();
    applyStyles(a, 'demo', '.x{color:red}', ':host{}');
    applyStyles(b, 'demo', '.x{color:red}', ':host{}');
    expect(a.adoptedStyleSheets[0]).toBe(b.adoptedStyleSheets[0]);
  });

  it('update() swaps the token layer and keeps the widget layer', () => {
    const s = shadow();
    const handle = applyStyles(s, 'demo', '.x{}', ':host{--a:1px}');
    const widgetBefore = s.adoptedStyleSheets[0];
    handle.update(':host{--a:2px}');
    expect(s.adoptedStyleSheets[0]).toBe(widgetBefore);
    expect(countAppliedSheets(s)).toBe(2);
  });

  it('dispose() removes all applied styles', () => {
    const s = shadow();
    const handle = applyStyles(s, 'demo', '.x{}', ':host{}');
    handle.dispose();
    expect(countAppliedSheets(s)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-runtime`
Expected: FAIL — `./styling` not found.

- [ ] **Step 3: Implement `packages/widget-runtime/src/styling.ts`**

```ts
import { rewriteRootToHost } from '@perimeter/theme';

export interface StyleHandle {
  /** Replace the per-instance token layer (studio live theme edits). */
  update(tokenCss: string): void;
  /** Remove all applied styles from the shadow root. */
  dispose(): void;
}

const widgetSheets = new Map<string, CSSStyleSheet>();

function supportsConstructable(): boolean {
  return (
    typeof CSSStyleSheet !== 'undefined' &&
    typeof CSSStyleSheet.prototype.replaceSync === 'function' &&
    typeof Document !== 'undefined' &&
    'adoptedStyleSheets' in Document.prototype
  );
}

/**
 * Inject the widget's compiled CSS (shared, one parse per name) and a
 * per-instance token sheet into a shadow root. Uses constructable
 * stylesheets when available, else two <style> elements.
 */
export function applyStyles(
  shadow: ShadowRoot,
  widgetName: string,
  widgetCss: string,
  tokenCss: string,
): StyleHandle {
  const rewritten = rewriteRootToHost(widgetCss);

  if (supportsConstructable()) {
    let widgetSheet = widgetSheets.get(widgetName);
    if (!widgetSheet) {
      widgetSheet = new CSSStyleSheet();
      widgetSheet.replaceSync(rewritten);
      widgetSheets.set(widgetName, widgetSheet);
    }
    const tokenSheet = new CSSStyleSheet();
    tokenSheet.replaceSync(tokenCss);
    shadow.adoptedStyleSheets = [widgetSheet, tokenSheet];
    return {
      update(next) {
        const t = new CSSStyleSheet();
        t.replaceSync(next);
        shadow.adoptedStyleSheets = [widgetSheet!, t];
      },
      dispose() {
        shadow.adoptedStyleSheets = [];
      },
    };
  }

  const widgetStyle = document.createElement('style');
  widgetStyle.setAttribute('data-perimeter-widget-css', '');
  widgetStyle.textContent = rewritten;
  const tokenStyle = document.createElement('style');
  tokenStyle.setAttribute('data-perimeter-tokens', '');
  tokenStyle.textContent = tokenCss;
  shadow.append(widgetStyle, tokenStyle);
  return {
    update(next) {
      tokenStyle.textContent = next;
    },
    dispose() {
      widgetStyle.remove();
      tokenStyle.remove();
    },
  };
}

/** Count applied style layers regardless of mode. Test + introspection helper. */
export function countAppliedSheets(shadow: ShadowRoot): number {
  if (shadow.adoptedStyleSheets && shadow.adoptedStyleSheets.length > 0) {
    return shadow.adoptedStyleSheets.length;
  }
  return shadow.querySelectorAll(
    'style[data-perimeter-widget-css], style[data-perimeter-tokens]',
  ).length;
}

/** Test helper — drop the shared-sheet cache between tests. */
export function clearStyleCache(): void {
  widgetSheets.clear();
}
```

- [ ] **Step 4: Run the test**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-runtime`
Expected: PASS (under happy-dom).

- [ ] **Step 5: Commit**

```bash
git add packages/widget-runtime/src/styling.ts packages/widget-runtime/tests/styling.test.ts
git commit -m "feat(runtime): styling module (shared constructable sheet + token layer, <style> fallback)"
```

### Task 3.2: Boolean-safe `data-*` parsing

**Files:**
- Modify: `packages/widget-runtime/src/data-attrs.ts`
- Modify: `packages/widget-runtime/tests/data-attrs.test.ts` (augment the existing file)

- [ ] **Step 1: Add failing tests** to the existing `packages/widget-runtime/tests/data-attrs.test.ts` (it imports `parseDataAttrs` from `../src/data-attrs` and has a `divWith(attrs)` helper). Append:

```ts
describe('parseDataAttrs booleans', () => {
  const boolSchema = z.object({ open: z.boolean().default(false), limit: z.coerce.number().default(1) });

  it('parses data-open="false" as boolean false (not truthy string)', () => {
    const { config } = parseDataAttrs(divWith({ 'data-open': 'false', 'data-limit': '5' }), boolSchema);
    expect(config.open).toBe(false);
    expect(config.limit).toBe(5);
  });
  it('parses data-open="true" as boolean true', () => {
    const { config } = parseDataAttrs(divWith({ 'data-open': 'true' }), boolSchema);
    expect(config.open).toBe(true);
  });
});
```

(The existing tests already cover `data-theme-*` separation and string/number config — keep them.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-runtime` (this package is RED overall until Task 3.4 — confirm specifically the new `data-open="false"` case fails, not just the unrelated stale tests)
Expected: FAIL — `"false"` currently reaches the schema as a string; with `z.boolean()` it throws.

- [ ] **Step 3: Coerce `"true"`/`"false"` to real booleans** in `packages/widget-runtime/src/data-attrs.ts`. Change the raw-config map type to `unknown` and convert before `schema.parse`:

```ts
export interface ParsedAttrs<T> {
  config: T;
  themeOverrides: Record<string, string>;
}

export function parseDataAttrs<S extends z.ZodTypeAny>(
  el: HTMLElement,
  schema: S,
): ParsedAttrs<z.infer<S>> {
  const rawConfig: Record<string, unknown> = {};
  const themeOverrides: Record<string, string> = {};

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    if (!name.startsWith('data-')) continue;
    if (name === MARKER) continue;
    if (name.startsWith(THEME_PREFIX)) {
      themeOverrides[name] = attr.value;
      continue;
    }
    const key = kebabToCamel(name.slice('data-'.length));
    rawConfig[key] = attr.value === 'true' ? true : attr.value === 'false' ? false : attr.value;
  }

  const config = schema.parse(rawConfig) as z.infer<S>;
  return { config, themeOverrides };
}
```

(Keep the existing `kebabToCamel`, `THEME_PREFIX`, `MARKER` constants.)

- [ ] **Step 4: Run the test**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-runtime` (the new boolean tests now PASS; the package is still RED on the stale `mount`/`auto-mount`/`global`/`registry` tests until Task 3.4)
Expected: the `parseDataAttrs booleans` describe block PASSES.

- [ ] **Step 5: Commit**

```bash
git add packages/widget-runtime/src/data-attrs.ts packages/widget-runtime/tests/data-attrs.test.ts
git commit -m "feat(runtime): boolean-safe data-* parsing (true/false -> real booleans)"
```

### Task 3.3: Rewrite `mount.tsx` to the new signature + styling module

**Files:**
- Modify: `packages/widget-runtime/src/mount.tsx`
- Modify: `packages/widget-runtime/src/registry.ts` (drop CSS map; keep instance registry)
- Replace: `packages/widget-runtime/tests/mount.test.tsx` (the existing file tests `mountWidget`/`nativeRender` — overwrite it entirely with the below)

- [ ] **Step 1: Write the failing test** (happy-dom env; uses `countAppliedSheets`, not `cssRules`)

```tsx
// packages/widget-runtime/tests/mount.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { mount } from '../src/mount';
import { countAppliedSheets, clearStyleCache } from '../src/styling';

beforeEach(() => clearStyleCache());

const tick = () => new Promise((r) => setTimeout(r, 0));

const widget = defineWidget({
  name: 'm-test',
  auth: 'none',
  schema: z.object({ label: z.string().default('hi') }),
  App: ({ config }) => <p data-testid="lbl">{config.label}</p>,
});

const CSS = '.box{color:rgb(1,2,3)}';

describe('mount', () => {
  it('attaches a shadow root and renders the App with parsed config', async () => {
    const host = document.createElement('div');
    host.setAttribute('data-label', 'world');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    const root = host.shadowRoot!;
    expect(root).toBeTruthy();
    await tick();
    expect(root.querySelector('[data-testid="lbl"]')!.textContent).toBe('world');
    handle.unmount();
  });

  it('applies a widget layer + token layer into the shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    expect(countAppliedSheets(host.shadowRoot!)).toBe(2);
    handle.unmount();
  });

  it('updateTokens keeps the shared widget layer and refreshes the token layer', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    const widgetLayerBefore = host.shadowRoot!.adoptedStyleSheets[0];
    handle.updateTokens({ 'color-primary': 'hsl(0 0% 0%)' });
    expect(host.shadowRoot!.adoptedStyleSheets[0]).toBe(widgetLayerBefore);
    expect(countAppliedSheets(host.shadowRoot!)).toBe(2);
    handle.unmount();
  });

  it('unmount removes all applied styles', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    handle.unmount();
    expect(countAppliedSheets(host.shadowRoot!)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-runtime`
Expected: FAIL — `mount` not exported (only `mountWidget`).

- [ ] **Step 3: Rewrite `packages/widget-runtime/src/mount.tsx`**

```tsx
import { createRoot, type Root } from 'react-dom/client';
import { MPLocalStorageAuth, type AuthProvider } from '@perimeter/auth';
import { createApiClient } from '@perimeter/api-client';
import { resolveTokens } from '@perimeter/theme';
import type { z } from 'zod';
import type { WidgetDefinition } from './define-widget';
import { parseDataAttrs } from './data-attrs';
import { applyStyles } from './styling';
import { deregisterInstance, registerInstance, type InstanceHandle } from './registry';
import { AuthProviderProvider } from './providers/auth-provider';
import { AuthGate } from './providers/auth-gate';
import { ErrorBoundary } from './providers/error-boundary';
import { makeWidgetQueryClient, QueryProvider } from './providers/query-provider';
import { ApiClientContext } from './hooks/use-api-client';

const DEFAULT_API_URL =
  (typeof globalThis !== 'undefined' &&
    (globalThis as { __PERIMETER_API_URL__?: string }).__PERIMETER_API_URL__) ||
  'https://api.perimeter.org';

/** Optional, rarely-needed mount inputs (the old options object, minus definition/target). */
export interface MountExtras {
  configOverrides?: Record<string, unknown> | undefined;
  apiBaseUrl?: string | undefined;
  authFactory?: (() => AuthProvider) | undefined;
}

export interface MountedWidget extends InstanceHandle {
  unmount(): void;
}

interface DisposableAuth {
  dispose?: () => void;
}

/**
 * The single render path. Used identically by the production IIFE (via autoMount)
 * and the studio dev harness. `css` is the widget's compiled Tailwind output,
 * imported as a `?inline` string — the same string in dev and prod.
 */
export function mount<S extends z.ZodTypeAny>(
  host: HTMLElement,
  definition: WidgetDefinition<S>,
  css: string,
  extras: MountExtras = {},
): MountedWidget {
  const parsed = parseDataAttrs(host, definition.schema);
  const dataAttrThemeOverrides = parsed.themeOverrides;
  const mergedConfig: Record<string, unknown> = {
    ...(parsed.config as Record<string, unknown>),
    ...(extras.configOverrides ?? {}),
  };
  let runtimeOverrides: Partial<Record<string, string>> = {};

  function tokenCss(): string {
    return resolveTokens({
      widgetOverrides: definition.themeOverrides,
      dataAttrOverrides: dataAttrThemeOverrides,
      runtimeOverrides,
    }).cssText;
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

  const styles = applyStyles(shadow, definition.name, css, tokenCss());

  const auth = (extras.authFactory ?? (() => new MPLocalStorageAuth()))();
  const apiClient = createApiClient({ baseUrl: extras.apiBaseUrl ?? DEFAULT_API_URL, auth });

  const reactRoot = document.createElement('div');
  shadow.appendChild(reactRoot);
  const root: Root = createRoot(reactRoot);
  const queryClient = makeWidgetQueryClient();
  const App = definition.App;

  root.render(
    <ErrorBoundary widgetName={definition.name}>
      <AuthProviderProvider value={auth}>
        <AuthGate widgetName={definition.name} mode={definition.auth}>
          <ApiClientContext.Provider value={apiClient}>
            <QueryProvider client={queryClient}>
              <App config={mergedConfig} auth={auth} />
            </QueryProvider>
          </ApiClientContext.Provider>
        </AuthGate>
      </AuthProviderProvider>
    </ErrorBoundary>,
  );

  const handle: MountedWidget = {
    unmount() {
      (auth as DisposableAuth).dispose?.();
      root.unmount();
      styles.dispose();
      while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
      deregisterInstance(definition.name, handle);
    },
    updateTokens(overrides) {
      runtimeOverrides = overrides;
      // Swap only the token layer; shared widget styles + React tree untouched.
      styles.update(tokenCss());
    },
  };
  registerInstance(definition.name, handle);
  return handle;
}
```

- [ ] **Step 4: Slim `packages/widget-runtime/src/registry.ts`** — remove the CSS map (CSS now lives in `styling.ts`); keep the instance registry. New file:

```ts
export interface InstanceHandle {
  unmount(): void;
  /** Re-resolve tokens on this instance (used by the studio theme editor). */
  updateTokens(overrides: Partial<Record<string, string>>): void;
}

const instances = new Map<string, Set<InstanceHandle>>();

export function registerInstance(name: string, handle: InstanceHandle): void {
  let set = instances.get(name);
  if (!set) {
    set = new Set();
    instances.set(name, set);
  }
  set.add(handle);
}

export function deregisterInstance(name: string, handle: InstanceHandle): void {
  instances.get(name)?.delete(handle);
}

export function getInstances(name: string): InstanceHandle[] {
  return Array.from(instances.get(name) ?? []);
}

export function clearAll(): void {
  instances.clear();
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-runtime`
Expected: PASS for `mount.test.tsx` and `styling.test.ts`. (`global.ts`, `auto-mount.ts`, `index.ts` still reference old symbols and will fail to **typecheck** — fixed in Task 3.4. Run only `test` here, not `typecheck`.)

- [ ] **Step 6: Commit**

```bash
git add packages/widget-runtime/src/mount.tsx packages/widget-runtime/src/registry.ts packages/widget-runtime/tests/mount.test.tsx
git commit -m "feat(runtime): single mount(host,def,css,extras) via styling module"
```

### Task 3.4: Update `autoMount`, `global`, `index`; delete `native-render`

**Files:**
- Modify: `packages/widget-runtime/src/auto-mount.ts`
- Modify: `packages/widget-runtime/src/global.ts`
- Modify: `packages/widget-runtime/src/index.ts`
- Delete: `packages/widget-runtime/src/native-render.ts`
- Replace: `packages/widget-runtime/tests/auto-mount.test.tsx` (existing file references the old one-arg signature — overwrite entirely)
- Rewrite: `packages/widget-runtime/tests/registry.test.ts` and `packages/widget-runtime/tests/global.test.tsx` (existing files test removed `registerCss`/`getCss` and the old `ensureGlobal(def)` — see Steps 6–7)

- [ ] **Step 1: Replace `packages/widget-runtime/tests/auto-mount.test.tsx`** with:

```tsx
// packages/widget-runtime/tests/auto-mount.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { autoMount, disposeAutoMount } from '../src/auto-mount';
import { clearStyleCache } from '../src/styling';

const widget = defineWidget({
  name: 'am-test',
  auth: 'none',
  schema: z.object({}),
  App: () => <span data-testid="am">ok</span>,
});

beforeEach(() => clearStyleCache());
afterEach(() => {
  disposeAutoMount();
  document.body.innerHTML = '';
});

describe('autoMount(definition, css)', () => {
  it('mounts existing targets and dynamically-added targets', async () => {
    const a = document.createElement('div');
    a.setAttribute('data-perimeter-widget', 'am-test');
    document.body.appendChild(a);

    autoMount(widget, '.x{}');
    await new Promise((r) => setTimeout(r, 0));
    expect(a.shadowRoot!.querySelector('[data-testid="am"]')).toBeTruthy();

    const b = document.createElement('div');
    b.setAttribute('data-perimeter-widget', 'am-test');
    document.body.appendChild(b);
    await new Promise((r) => setTimeout(r, 0)); // let the MutationObserver fire
    expect(b.shadowRoot!.querySelector('[data-testid="am"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec turbo run test --filter=@perimeter/widget-runtime`
Expected: FAIL — `autoMount` signature still takes one arg / imports `mountWidget`.

- [ ] **Step 3: Update `packages/widget-runtime/src/auto-mount.ts`** to thread `css` and call `mount`:

```ts
import type { z } from 'zod';
import type { WidgetDefinition } from './define-widget';
import { mount } from './mount';

const MARKER = 'data-perimeter-widget';
const MOUNTED = '__perimeterMounted';

type ObserverHandle = { observer: MutationObserver };
const observers = new Map<string, ObserverHandle>();

function mountIfMatch<S extends z.ZodTypeAny>(def: WidgetDefinition<S>, css: string, el: Element): void {
  if (!(el instanceof HTMLElement)) return;
  if (el.getAttribute(MARKER) !== def.name) return;
  const node = el as HTMLElement & { [MOUNTED]?: boolean };
  if (node[MOUNTED]) return;
  node[MOUNTED] = true;
  mount(el, def, css);
}

export function autoMount<S extends z.ZodTypeAny>(def: WidgetDefinition<S>, css: string): void {
  document
    .querySelectorAll<HTMLElement>(`[${MARKER}="${def.name}"]`)
    .forEach((el) => mountIfMatch(def, css, el));

  if (observers.has(def.name)) return;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          mountIfMatch(def, css, node);
          node
            .querySelectorAll<HTMLElement>(`[${MARKER}="${def.name}"]`)
            .forEach((el) => mountIfMatch(def, css, el));
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  observers.set(def.name, { observer });
}

export function disposeAutoMount(): void {
  for (const { observer } of observers.values()) observer.disconnect();
  observers.clear();
}
```

- [ ] **Step 4: Update `packages/widget-runtime/src/global.ts`** — the global `mount(name, target)` escape hatch needs CSS. Carry the registered widget's css alongside its definition:

```ts
import type { z } from 'zod';
import type { ThemeToken } from '@perimeter/theme';
import type { WidgetDefinition } from './define-widget';
import { getInstances } from './registry';
import { mount, type MountedWidget } from './mount';

interface RegisteredWidget {
  definition: WidgetDefinition;
  css: string;
}

export interface PerimeterWidgetsGlobal {
  widgets: Record<string, RegisteredWidget>;
  applyOverrides(name: string, overrides: Partial<Record<ThemeToken, string>>): void;
  mount(name: string, target: HTMLElement, configOverrides?: Record<string, unknown>): MountedWidget;
}

declare global {
  interface Window {
    PerimeterWidgets: PerimeterWidgetsGlobal;
  }
}

function getOrCreate(): PerimeterWidgetsGlobal {
  const existing = (window as { PerimeterWidgets?: PerimeterWidgetsGlobal }).PerimeterWidgets;
  if (existing) return existing;
  const fresh: PerimeterWidgetsGlobal = {
    widgets: {},
    applyOverrides(name, overrides) {
      for (const handle of getInstances(name)) handle.updateTokens(overrides);
    },
    mount(name, target, configOverrides) {
      const entry = fresh.widgets[name];
      if (!entry) throw new Error(`No widget registered with name "${name}"`);
      return mount(target, entry.definition, entry.css, { configOverrides });
    },
  };
  window.PerimeterWidgets = fresh;
  return fresh;
}

export function ensureGlobal<S extends z.ZodTypeAny>(def: WidgetDefinition<S>, css: string): void {
  const g = getOrCreate();
  g.widgets[def.name] = { definition: def as unknown as WidgetDefinition, css };
}
```

- [ ] **Step 5: Delete `native-render.ts` and rewrite `index.ts`**

```bash
git rm packages/widget-runtime/src/native-render.ts
```

New `packages/widget-runtime/src/index.ts`:

```ts
export {
  defineWidget,
  type DefineWidgetOptions,
  type WidgetDefinition,
  type AuthMode,
} from './define-widget';
export { mount, type MountExtras, type MountedWidget } from './mount';
export { autoMount, disposeAutoMount } from './auto-mount';
export { ensureGlobal, type PerimeterWidgetsGlobal } from './global';
export { useAuth } from './hooks/use-auth';
export { useApiClient } from './hooks/use-api-client';

/** @internal Test helpers. */
export { clearAll } from './registry';
export { clearStyleCache } from './styling';
```

(`disposeAutoMount` stays available via `./auto-mount` for tests; re-export it from `index.ts` too if you want to preserve today's public surface — optional.)

- [ ] **Step 6: Rewrite `packages/widget-runtime/tests/registry.test.ts`** — the existing file tests the removed `registerCss`/`getCss`. Overwrite it to cover only the surviving instance registry:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerInstance,
  deregisterInstance,
  getInstances,
  clearAll,
} from '../src/registry';

const stub = () => ({ unmount() {}, updateTokens() {} });

describe('instance registry', () => {
  beforeEach(() => clearAll());

  it('registers and lists instances by widget name', () => {
    const a = stub();
    registerInstance('demo', a);
    expect(getInstances('demo')).toContain(a);
  });
  it('deregisters an instance', () => {
    const a = stub();
    registerInstance('demo', a);
    deregisterInstance('demo', a);
    expect(getInstances('demo')).not.toContain(a);
  });
  it('clearAll empties the registry', () => {
    registerInstance('demo', stub());
    clearAll();
    expect(getInstances('demo')).toHaveLength(0);
  });
});
```

- [ ] **Step 7: Rewrite `packages/widget-runtime/tests/global.test.tsx`** — the existing file calls the old one-arg `ensureGlobal(def)` + `registerCss`. Overwrite to the css-aware API:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { ensureGlobal } from '../src/global';
import { clearAll } from '../src/registry';
import { clearStyleCache } from '../src/styling';

const def = defineWidget({
  name: 'g-test',
  auth: 'none',
  schema: z.object({}),
  App: () => <div data-testid="x">ok</div>,
});

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('window.PerimeterWidgets', () => {
  beforeEach(() => {
    clearAll();
    clearStyleCache();
    (window as unknown as { PerimeterWidgets?: unknown }).PerimeterWidgets = undefined;
    document.body.innerHTML = '';
  });

  it('registers a widget with its css and mounts via the global escape hatch', async () => {
    ensureGlobal(def, ':host{}');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = window.PerimeterWidgets.mount('g-test', host);
    await tick();
    expect(host.shadowRoot!.querySelector('[data-testid="x"]')).toBeTruthy();
    handle.unmount();
  });

  it('throws for an unregistered widget name', () => {
    ensureGlobal(def, ':host{}');
    const host = document.createElement('div');
    expect(() => window.PerimeterWidgets.mount('nope', host)).toThrow();
  });
});
```

- [ ] **Step 8: Confirm no source or test still imports the removed symbols**

Run: `grep -rn "mountWidget\|registerCss\|getCss\|nativeRender\|from './sheets'\|from '../src/native-render'" packages/widget-runtime/src packages/widget-runtime/tests`
Expected: no matches (all callers migrated). If any appear, fix them before continuing.

- [ ] **Step 9: Run the full runtime suite + typecheck**

Run: `pnpm exec turbo run test typecheck lint --filter=@perimeter/widget-runtime`
Expected: PASS — the whole package is now green under happy-dom. (`autoMount` requires `css`; `registerCss`/`getCss`/`nativeRender` are gone.)

- [ ] **Step 10: Commit**

```bash
git add packages/widget-runtime/src
git commit -m "feat(runtime): autoMount(def,css) + css-aware global; drop native-render and css registry"
```

---

## Chunk 4: `@perimeter/vite-plugin-widget` — `widgetConfig()` helper

### Task 4.1: Replace the plugin with a config helper

**Files:**
- Create: `packages/vite-plugin-widget/src/config.ts`
- Modify: `packages/vite-plugin-widget/src/index.ts`
- Delete: `packages/vite-plugin-widget/src/plugin.ts`, `packages/vite-plugin-widget/src/virtual-entry.ts`
- Delete: `packages/vite-plugin-widget/tests/plugin.test.ts`, `packages/vite-plugin-widget/tests/virtual-entry.test.ts` (they test the deleted modules)
- Modify: `packages/vite-plugin-widget/package.json` (drop the `@perimeter/widget-runtime` dep)
- Test: `packages/vite-plugin-widget/tests/config.test.ts` (NEW)

- [ ] **Step 1: Write the failing test** (assert the shape of the returned config; pure function, no Vite run needed)

```ts
// packages/vite-plugin-widget/tests/config.test.ts
import { describe, it, expect } from 'vitest';
import { widgetConfig } from '../src/config';

describe('widgetConfig', () => {
  const cfg = widgetConfig({ name: 'demo', version: '1.2.3' });

  it('builds src/entry.ts as a single IIFE named after the widget', () => {
    expect(cfg.build?.lib).toMatchObject({ formats: ['iife'] });
    // entry resolves to the widget's src/entry.ts
    expect(String((cfg.build!.lib as { entry: string }).entry)).toMatch(/entry\.ts$/);
  });
  it('emits one file named index.js', () => {
    const fileName = (cfg.build!.lib as { fileName: (f: string) => string }).fileName('iife');
    expect(fileName).toBe('index.js');
  });
  it('pins NODE_ENV=production and injects the widget version', () => {
    expect(cfg.define).toMatchObject({
      'process.env.NODE_ENV': '"production"',
      __PERIMETER_WIDGET_VERSION__: '"1.2.3"',
    });
  });
  it('outputs to dist with sourcemaps', () => {
    expect(cfg.build?.outDir).toBe('dist');
    expect(cfg.build?.sourcemap).toBe(true);
  });
});
```

- [ ] **Step 2: Delete the stale tests, then run** — `git rm packages/vite-plugin-widget/tests/plugin.test.ts packages/vite-plugin-widget/tests/virtual-entry.test.ts`, then:

Run: `pnpm exec turbo run test --filter=@perimeter/vite-plugin-widget`
Expected: FAIL — `widgetConfig` not exported.

- [ ] **Step 3: Implement `packages/vite-plugin-widget/src/config.ts`**

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { UserConfig } from 'vite';

/**
 * Self-contained PostCSS plugin: rewrite `<n>rem` lengths to `<n*16>px` so
 * Tailwind's rem-based scale is immune to a host page's `html { font-size }`
 * once the widget renders inside a shadow root. No external dependency.
 */
const REM_RE = /(-?[\d.]+)rem\b/g;
const remToPxPlugin = {
  postcssPlugin: 'perimeter-rem-to-px',
  Declaration(decl: { value: string }) {
    if (decl.value.includes('rem')) {
      decl.value = decl.value.replace(REM_RE, (_m, n: string) => `${parseFloat(n) * 16}px`);
    }
  },
};

export interface WidgetConfigOptions {
  /** Widget name — MUST match defineWidget({ name }). */
  name: string;
  /** Entry built into the IIFE. Defaults to 'src/entry.ts'. */
  entry?: string | undefined;
  /** IIFE global name. Defaults to `PerimeterWidget_<name>`. */
  globalName?: string | undefined;
  /** Override the version (tests). Defaults to the package.json version at cwd. */
  version?: string | undefined;
  /** Package root. Defaults to process.cwd(). */
  root?: string | undefined;
}

function readVersion(root: string): string {
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Returns a Vite config for building a widget into a single self-contained IIFE.
 * No virtual entry, no CSS placeholder substitution: the widget's `src/entry.ts`
 * imports its compiled CSS via `?inline` and calls `autoMount(widget, css)`.
 */
export function widgetConfig(options: WidgetConfigOptions): UserConfig {
  const root = options.root ?? process.cwd();
  const version = options.version ?? readVersion(root);
  const entry = path.resolve(root, options.entry ?? 'src/entry.ts');
  const globalName = options.globalName ?? `PerimeterWidget_${options.name}`;

  return {
    define: {
      // Tree-shake React/ReactDOM/RQ dev branches out of the browser-shipped IIFE.
      'process.env.NODE_ENV': '"production"',
      __PERIMETER_WIDGET_VERSION__: JSON.stringify(version),
    },
    css: { postcss: { plugins: [remToPxPlugin] } },
    build: {
      lib: { entry, name: globalName, formats: ['iife'], fileName: () => 'index.js' },
      outDir: 'dist',
      sourcemap: true,
      target: 'es2022',
      emptyOutDir: true,
    },
  };
}
```

- [ ] **Step 4: Rewrite `packages/vite-plugin-widget/src/index.ts`**

```ts
export { widgetConfig, type WidgetConfigOptions } from './config';
```

- [ ] **Step 5: Delete the old plugin files & clean up deps**

```bash
git rm packages/vite-plugin-widget/src/plugin.ts packages/vite-plugin-widget/src/virtual-entry.ts
```

In `packages/vite-plugin-widget/package.json`: **remove** the `@perimeter/widget-runtime` dependency (it was only needed by the deleted virtual entry). Ensure `vite` is present as a `peerDependency` (the helper imports only its `UserConfig` type). No new runtime dependency is added — the rem→px transform is the inline plugin above. Run `pnpm install`.

- [ ] **Step 6: Run tests + typecheck + lint**

Run: `pnpm exec turbo run test typecheck lint --filter=@perimeter/vite-plugin-widget`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/vite-plugin-widget package.json pnpm-lock.yaml
git commit -m "feat(vite-plugin): widgetConfig() helper + rem->px; drop virtual-entry codegen"
```

---

## Chunk 5: Carry-over packages (auth, api-client, ui) + fold api-types into api-hooks

### Task 5.1: Verify auth, api-client, ui still build untouched

These packages have no source changes. Confirm they still pass in the new graph.

- [ ] **Step 1: Run their suites**

Run: `pnpm exec turbo run test typecheck lint --filter=@perimeter/auth --filter=@perimeter/api-client --filter=@perimeter/ui`
Expected: PASS. If any fail, the failure is an *unintended* coupling to a removed symbol — fix the import, do not change behavior.

- [ ] **Step 2: Commit only if a fix was needed** (otherwise skip)

```bash
git commit -am "chore(widgets): adjust carry-over package imports after runtime changes"
```

### Task 5.2: Fold `@perimeter/api-types` into `@perimeter/api-hooks`

**Files:**
- Move: `packages/api-types/src/operations.ts` → `packages/api-hooks/src/generated/operations.ts`
- Move: `packages/api-types/src/index.ts` exports → re-exported from `packages/api-hooks/src/index.ts`
- Move: `packages/api-types/spec/` + the `sync`/`generate` scripts → `packages/api-hooks/`
- Modify: every `@perimeter/api-hooks` source that imported `@perimeter/api-types`
- Delete: `packages/api-types/`

- [ ] **Step 1: Inventory the dependency and the codegen scripts**

Run: `grep -rln "@perimeter/api-types" packages studio widgets/example` and `cat packages/api-types/package.json`
Expected: the importers are inside `packages/api-hooks/src` (record them). `widgets/sermons` also imports it, but sermons is out of the workspace (decision #12) and is rewired in Phase 2 — **do not touch it here.** Note the `sync`/`generate` scripts and which file they run (`scripts/generate.ts`) and which deps they need (`openapi-typescript`, `tsx`).

- [ ] **Step 2: Move the generated types + spec + codegen script into api-hooks**

```bash
mkdir -p packages/api-hooks/src/generated packages/api-hooks/spec packages/api-hooks/scripts
git mv packages/api-types/src/operations.ts packages/api-hooks/src/generated/operations.ts
git mv packages/api-types/spec/spec.yaml packages/api-hooks/spec/spec.yaml
git mv packages/api-types/scripts/generate.ts packages/api-hooks/scripts/generate.ts
```

Copy the `sync` and `generate` npm scripts from `packages/api-types/package.json` into `packages/api-hooks/package.json`, retargeting paths: input `spec/spec.yaml`, output `src/generated/operations.ts`, script `scripts/generate.ts`. Edit `scripts/generate.ts` so its hardcoded input/output paths match the new locations, and replace any `npx openapi-typescript` invocation with `pnpm exec openapi-typescript` (repo rule: never npx). Add `openapi-typescript` and `tsx` to api-hooks `devDependencies` at the versions api-types used.

- [ ] **Step 3: Repoint imports** — in each api-hooks source from Step 1, replace `from '@perimeter/api-types'` with the relative `from '../generated/operations'` (adjust depth per file). Re-export the public types from `packages/api-hooks/src/index.ts`:

```ts
export type { operations, components, paths } from './generated/operations';
```

- [ ] **Step 4: Delete the old package & reinstall**

```bash
git rm -r packages/api-types
pnpm install
```

- [ ] **Step 5: Verify**

Run: `pnpm exec turbo run typecheck test lint --filter=@perimeter/api-hooks`
Expected: PASS. Then `grep -rln "@perimeter/api-types" packages studio widgets/example` → no matches. (A match inside `widgets/sermons` is expected and fine — sermons is out of the workspace and is rewired during its Phase 2 port.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(api-hooks): absorb api-types (generated operations + codegen); delete api-types package"
```

---

## Chunk 6: The `example` widget on the new contract

### Task 6.1: Split `widget.tsx` / `entry.ts`, switch to `?inline` CSS

**Files:**
- Create: `widgets/example/src/widget.tsx` (the `defineWidget` default; no CSS import)
- Create: `widgets/example/src/entry.ts` (IIFE bootstrap; imports `styles.css?inline`)
- Create: `widgets/example/src/env.d.ts` (declare the version global + `?inline` module)
- Modify: `widgets/example/vite.config.ts` (use `widgetConfig`)
- Modify: `widgets/example/package.json` (`exports` → `src/widget.tsx`; build entry note)
- Delete: `widgets/example/src/index.tsx`, `widgets/example/src/index.widget.d.ts`
- Modify: `widgets/example/tests/*` to the new entry points

- [ ] **Step 1: Create `widgets/example/src/widget.tsx`**

```tsx
import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './app';

export default defineWidget({
  name: 'example',
  auth: 'none',
  schema: z.object({
    greeting: z.string().default('Hello'),
    count: z.coerce.number().int().min(0).max(20).default(3),
  }),
  App: ({ config }) => <App config={config} />,
});
```

- [ ] **Step 2: Create `widgets/example/src/env.d.ts`**

```ts
/// <reference types="vite/client" />
declare const __PERIMETER_WIDGET_VERSION__: string;
```

(Vite already provides the `*.css?inline` module type via `vite/client`.)

- [ ] **Step 3: Create `widgets/example/src/entry.ts`**

```ts
import css from './styles.css?inline';
import { autoMount, ensureGlobal } from '@perimeter/widget-runtime';
import widget from './widget';

widget.version = __PERIMETER_WIDGET_VERSION__;
ensureGlobal(widget, css);
autoMount(widget, css);
```

- [ ] **Step 4: Replace `widgets/example/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { widgetConfig } from '@perimeter/vite-plugin-widget';

export default defineConfig(widgetConfig({ name: 'example' }));
```

- [ ] **Step 5: Update `widgets/example/package.json`** — point the package export at the studio-importable widget module and delete the old typings file:

```json
"exports": {
  ".": {
    "types": "./src/widget.tsx",
    "default": "./src/widget.tsx"
  }
}
```

```bash
git rm widgets/example/src/index.tsx widgets/example/src/index.widget.d.ts
```

(Keep `widgets/example/src/styles.css` as-is: the three `@tailwind` directives. Keep `tailwind.config.ts`/`postcss.config.js`.)

- [ ] **Step 6: Update the existing tests.** `tests/app.test.tsx` imports `App` directly and is unaffected (keep it). The widget now builds to the widget-local `dist/index.js` (the new `widgetConfig` sets `outDir: 'dist'`, replacing the old root `../../dist/example`); the Phase 3 release CLI will read from this widget-local `dist`. Replace `widgets/example/tests/bundle.test.ts` with a self-contained build assertion:

```ts
// widgets/example/tests/bundle.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const bundle = path.join(distDir, 'index.js');

beforeAll(() => {
  execSync('pnpm exec vite build', { cwd: root, stdio: 'inherit' });
}, 120_000);

describe('built example bundle', () => {
  it('emits a single IIFE at dist/index.js', () => {
    expect(existsSync(bundle)).toBe(true);
  });
  it('inlines CSS — no separate .css asset is emitted', () => {
    expect(readdirSync(distDir).some((f) => f.endsWith('.css'))).toBe(false);
  });
  it('self-mounts: bundle references the widget name and PerimeterWidgets global', () => {
    const code = readFileSync(bundle, 'utf8');
    expect(code).toContain('example');
    expect(code).toContain('PerimeterWidgets');
  });
});
```

(The `PerimeterWidgets` string now comes from `entry.ts` calling `ensureGlobal`, not from the old plugin baking `__perimeterGlobal`. Confirm `tests/setup.ts` is still valid; the build runs through the real `widgetConfig`, so the rem→px transform and `?inline` CSS path are exercised here too.)

- [ ] **Step 7: Build + test the widget**

Run: `pnpm --filter @perimeter/widget-example build`
Expected: produces `widgets/example/dist/index.js` (+ `.map`), single IIFE, no separate `.css` asset.

Run: `pnpm exec turbo run test typecheck lint --filter=@perimeter/widget-example`
Expected: PASS.

- [ ] **Step 8: Manual smoke test the built bundle** — create a throwaway HTML file that loads `dist/index.js` and contains `<div data-perimeter-widget="example" data-greeting="Hi" data-count="2"></div>`; open it; confirm two cards render inside a shadow root with styles applied. Delete the file after.

- [ ] **Step 9: Commit**

```bash
git add widgets/example
git commit -m "feat(widget-example): split widget.tsx/entry.ts on the new single-mount contract"
```

---

## Chunk 7: The Vite studio (dev harness + gallery)

The studio is a plain Vite + React app. It auto-discovers widgets and UI components and previews them through the **real** `mount()`.

### Task 7.1: Scaffold the studio app

**Files:**
- Create: `studio/package.json`, `studio/vite.config.ts`, `studio/tsconfig.json`, `studio/index.html`, `studio/postcss.config.js`, `studio/tailwind.config.ts`, `studio/src/main.tsx`, `studio/src/styles.css`, `studio/src/env.d.ts`

- [ ] **Step 1: `studio/package.json`**

```json
{
  "name": "@perimeter/studio",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@perimeter/theme": "workspace:*",
    "@perimeter/ui": "workspace:*",
    "@perimeter/widget-runtime": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.1",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: `studio/vite.config.ts`** — allow importing widget/ui sources from the workspace root:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [workspaceRoot] } },
});
```

- [ ] **Step 3:** Add the following studio files.

`studio/tsconfig.json` — note it imports `.tsx` sources from sibling packages via glob, so keep `moduleResolution: Bundler` and include the workspace globs it reads:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "../widgets/*/src/widget.tsx", "../packages/ui/src/*.tsx"]
}
```

Also add: `studio/index.html` (root `<div id="root">` + `<script type="module" src="/src/main.tsx">`), `studio/postcss.config.js` + `studio/tailwind.config.ts` (standard Tailwind v3 for the studio's own chrome only — NOT the widget tokens; `content: ['./index.html', './src/**/*.tsx']`), `studio/src/styles.css` (the three `@tailwind` directives), `studio/src/env.d.ts` (`/// <reference types="vite/client" />`), and `studio/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Install + boot**

Run: `pnpm install && pnpm --filter @perimeter/studio dev`
Expected: dev server boots (blank App is fine for now). Stop it.

- [ ] **Step 5: Commit**

```bash
git add studio package.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "feat(studio): scaffold Vite + React studio app"
```

### Task 7.2: Auto-discovery of widgets and components

**Files:**
- Create: `studio/src/lib/discovery.ts`
- Test: `studio/src/lib/discovery.test.ts` (NEW; uses a mocked glob)

`import.meta.glob` is resolved by Vite at build/serve time. The discovery module normalizes glob results into typed lists.

- [ ] **Step 1: Write the failing test** (inject fake glob maps so the test is hermetic)

```ts
// studio/src/lib/discovery.test.ts
import { describe, it, expect } from 'vitest';
import { toWidgetEntries, toComponentEntries } from './discovery';

describe('discovery normalizers', () => {
  it('derives a widget slug from its path', () => {
    const entries = toWidgetEntries({
      '/widgets/sermons/src/widget.tsx': async () => ({ default: { name: 'sermons' } }),
      '/widgets/example/src/widget.tsx': async () => ({ default: { name: 'example' } }),
    });
    expect(entries.map((e) => e.slug).sort()).toEqual(['example', 'sermons']);
  });
  it('derives a component name from its filename', () => {
    const entries = toComponentEntries({
      '/packages/ui/src/button.tsx': async () => ({}),
      '/packages/ui/src/card.tsx': async () => ({}),
    });
    expect(entries.map((e) => e.name).sort()).toEqual(['button', 'card']);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm --filter @perimeter/studio test`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement `studio/src/lib/discovery.ts`**

```ts
import type { WidgetDefinition } from '@perimeter/widget-runtime';

type Importer<T> = () => Promise<T>;
type GlobMap<T> = Record<string, Importer<T>>;

export interface WidgetEntry {
  slug: string;
  load: Importer<{ default: WidgetDefinition }>;
  loadCss: Importer<{ default: string }>;
}
export interface ComponentEntry {
  name: string;
  load: Importer<Record<string, unknown>>;
}

export function toWidgetEntries(
  defs: GlobMap<{ default: WidgetDefinition }>,
  css: GlobMap<{ default: string }> = {},
): WidgetEntry[] {
  return Object.entries(defs)
    .map(([file, load]) => {
      const slug = file.split('/widgets/')[1]!.split('/')[0]!;
      const cssKey = `/widgets/${slug}/src/styles.css`;
      const loadCss = css[cssKey] ?? (async () => ({ default: '' }));
      return { slug, load, loadCss };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export function toComponentEntries(mods: GlobMap<Record<string, unknown>>): ComponentEntry[] {
  return Object.entries(mods)
    .map(([file, load]) => ({ name: file.split('/').pop()!.replace(/\.tsx$/, ''), load }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Live globs (Vite rewrites these at build time). `?inline` for css; eager:false.
export const widgetDefGlob = import.meta.glob('/widgets/*/src/widget.tsx') as GlobMap<{
  default: WidgetDefinition;
}>;
export const widgetCssGlob = import.meta.glob('/widgets/*/src/styles.css', {
  query: '?inline',
  import: 'default',
}) as unknown as GlobMap<{ default: string }>;
export const componentGlob = import.meta.glob('/packages/ui/src/*.tsx') as GlobMap<
  Record<string, unknown>
>;
```

- [ ] **Step 4: Run the test**

Run: `pnpm --filter @perimeter/studio test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add studio/src/lib
git commit -m "feat(studio): auto-discover widgets and ui components via import.meta.glob"
```

### Task 7.3: `WidgetPreview` — mount a widget through the real path

**Files:**
- Create: `studio/src/components/WidgetPreview.tsx`

- [ ] **Step 1: Implement `studio/src/components/WidgetPreview.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { mount, type WidgetDefinition, type MountedWidget } from '@perimeter/widget-runtime';
import type { WidgetEntry } from '../lib/discovery';

interface Props {
  entry: WidgetEntry;
  /** data-* config overrides from the ConfigPanel, keyed by camelCase. */
  configOverrides: Record<string, unknown>;
  /** runtime theme token overrides from the ThemeEditor. */
  tokenOverrides: Record<string, string>;
  /** Lets the parent (App) feed the loaded definition to the ConfigPanel. */
  onDefinition?: (def: WidgetDefinition) => void;
}

export function WidgetPreview({ entry, configOverrides, tokenOverrides, onDefinition }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<MountedWidget | null>(null);
  const [def, setDef] = useState<WidgetDefinition | null>(null);
  const [css, setCss] = useState<string>('');

  // Load the widget module + its css whenever the selected widget changes.
  useEffect(() => {
    let alive = true;
    void Promise.all([entry.load(), entry.loadCss()]).then(([m, c]) => {
      if (!alive) return;
      setDef(m.default);
      onDefinition?.(m.default);
      setCss((c as unknown as { default: string }).default ?? (c as unknown as string));
    });
    return () => {
      alive = false;
    };
  }, [entry, onDefinition]);

  // (Re)mount when def/css/config change. Same mount() used in production.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !def) return;
    handleRef.current = mount(host, def, css, { configOverrides });
    return () => {
      handleRef.current?.unmount();
      handleRef.current = null;
    };
  }, [def, css, configOverrides]);

  // Live token edits without a remount.
  useEffect(() => {
    handleRef.current?.updateTokens(tokenOverrides);
  }, [tokenOverrides]);

  return <div ref={hostRef} data-perimeter-widget-preview />;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @perimeter/studio typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add studio/src/components/WidgetPreview.tsx
git commit -m "feat(studio): WidgetPreview mounts through the real mount() path"
```

### Task 7.4: `ThemeEditor`, `ConfigPanel`, `ComponentPreview`, and `App`

**Files:**
- Create: `studio/src/components/ThemeEditor.tsx`, `studio/src/components/ConfigPanel.tsx`, `studio/src/components/ComponentPreview.tsx`
- Create: `studio/src/App.tsx`

- [ ] **Step 1: `ThemeEditor.tsx`** — list `globalTokens`, render an input per token, lift `{ [token]: value }` overrides via `onChange`:

```tsx
import { globalTokens, type ThemeToken } from '@perimeter/theme';

interface Props {
  overrides: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

export function ThemeEditor({ overrides, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="font-semibold">Theme tokens</h3>
      {(Object.keys(globalTokens) as ThemeToken[]).map((token) => (
        <label key={token} className="grid grid-cols-2 items-center gap-2 text-sm">
          <span className="truncate">{token}</span>
          <input
            className="rounded border px-2 py-1"
            defaultValue={globalTokens[token]}
            onChange={(e) => onChange({ ...overrides, [token]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `ConfigPanel.tsx`** — derive editable fields from the widget's zod schema. `WidgetDefinition` erases the schema's static type, so guard at runtime with `z.ZodObject` before reading `.shape`; fall back to a JSON textarea otherwise. Lift camelCase string values as `configOverrides` (the widget's schema coerces them):

```tsx
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';

interface Props {
  definition: WidgetDefinition;
  overrides: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function ConfigPanel({ definition, overrides, onChange }: Props) {
  const schema = definition.schema;
  if (!(schema instanceof z.ZodObject)) {
    return (
      <textarea
        className="h-32 w-full rounded border p-2 font-mono text-xs"
        defaultValue="{}"
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            /* ignore invalid json while typing */
          }
        }}
      />
    );
  }
  const keys = Object.keys((schema as z.ZodObject<z.ZodRawShape>).shape);
  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="font-semibold">Config (data-*)</h3>
      {keys.map((key) => (
        <label key={key} className="grid grid-cols-2 items-center gap-2 text-sm">
          <span className="truncate">{key}</span>
          <input
            className="rounded border px-2 py-1"
            value={String(overrides[key] ?? '')}
            onChange={(e) => onChange({ ...overrides, [key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `ComponentPreview.tsx`** — dynamically import a `ComponentEntry`, then render each exported React component once inside a wrapper `div` that carries the theme tokens as inline CSS variables (browsing only; no shadow root):

```tsx
import { useEffect, useState, type ComponentType, type CSSProperties } from 'react';
import { globalTokens, type ThemeToken } from '@perimeter/theme';
import type { ComponentEntry } from '../lib/discovery';

const tokenStyle = Object.fromEntries(
  (Object.keys(globalTokens) as ThemeToken[]).map((t) => [`--${t}`, globalTokens[t]]),
) as CSSProperties;

export function ComponentPreview({ entry }: { entry: ComponentEntry }) {
  const [exports, setExports] = useState<Record<string, unknown>>({});
  useEffect(() => {
    let alive = true;
    void entry.load().then((m) => {
      if (alive) setExports(m);
    });
    return () => {
      alive = false;
    };
  }, [entry]);

  const components = Object.entries(exports).filter(
    ([name, val]) => typeof val === 'function' && /^[A-Z]/.test(name),
  ) as [string, ComponentType][];

  return (
    <div style={tokenStyle} className="flex flex-col gap-6 p-4">
      {components.map(([name, Comp]) => (
        <div key={name} className="rounded border p-4">
          <div className="mb-2 text-xs text-gray-500">{name}</div>
          <Comp />
        </div>
      ))}
    </div>
  );
}
```

(Components requiring required props may throw; wrap each in a tiny error boundary or `try` if needed. For Phase 1 it is acceptable that prop-less components render and others show a caught error — note this limitation in the studio nav.)

- [ ] **Step 4: `App.tsx`** — two-pane layout wiring the discovered entries to the previews and lifting both override maps:

```tsx
import { useMemo, useState } from 'react';
import {
  toWidgetEntries,
  toComponentEntries,
  widgetDefGlob,
  widgetCssGlob,
  componentGlob,
} from './lib/discovery';
import { WidgetPreview } from './components/WidgetPreview';
import { ComponentPreview } from './components/ComponentPreview';
import { ThemeEditor } from './components/ThemeEditor';
import { ConfigPanel } from './components/ConfigPanel';
import type { WidgetDefinition } from '@perimeter/widget-runtime';

type Selection =
  | { kind: 'widget'; slug: string }
  | { kind: 'component'; name: string }
  | null;

export function App() {
  const widgets = useMemo(() => toWidgetEntries(widgetDefGlob, widgetCssGlob), []);
  const components = useMemo(() => toComponentEntries(componentGlob), []);
  const [selection, setSelection] = useState<Selection>(
    widgets[0] ? { kind: 'widget', slug: widgets[0].slug } : null,
  );
  const [configOverrides, setConfigOverrides] = useState<Record<string, unknown>>({});
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>({});
  const [def, setDef] = useState<WidgetDefinition | null>(null);

  const widget = selection?.kind === 'widget'
    ? widgets.find((w) => w.slug === selection.slug)
    : undefined;
  const component = selection?.kind === 'component'
    ? components.find((c) => c.name === selection.name)
    : undefined;

  return (
    <div className="grid h-screen grid-cols-[16rem_1fr_18rem] font-sans">
      <nav className="overflow-y-auto border-r p-3 text-sm">
        <h2 className="mb-1 font-semibold">Widgets</h2>
        {widgets.map((w) => (
          <button key={w.slug} className="block w-full text-left hover:underline"
            onClick={() => { setSelection({ kind: 'widget', slug: w.slug }); setConfigOverrides({}); }}>
            {w.slug}
          </button>
        ))}
        <h2 className="mb-1 mt-4 font-semibold">Components</h2>
        {components.map((c) => (
          <button key={c.name} className="block w-full text-left hover:underline"
            onClick={() => setSelection({ kind: 'component', name: c.name })}>
            {c.name}
          </button>
        ))}
      </nav>

      <main className="overflow-auto bg-gray-50 p-6">
        {widget && (
          <>
            <WidgetPreview
              entry={widget}
              configOverrides={configOverrides}
              tokenOverrides={tokenOverrides}
              onDefinition={setDef}
            />
            <pre className="mt-6 rounded bg-gray-900 p-3 text-xs text-gray-100">{`<div data-perimeter-widget="${widget.slug}"></div>
<script src="https://widgets.perimeter.org/${widget.slug}/latest.js" async></script>`}</pre>
          </>
        )}
        {component && <ComponentPreview entry={component} />}
      </main>

      <aside className="overflow-y-auto border-l">
        {widget && def && (
          <ConfigPanel definition={def} overrides={configOverrides} onChange={setConfigOverrides} />
        )}
        {widget && <ThemeEditor overrides={tokenOverrides} onChange={setTokenOverrides} />}
      </aside>
    </div>
  );
}
```

Add an `onDefinition?: (def: WidgetDefinition) => void` prop to `WidgetPreview` (call it from the load effect after `setDef(m.default)`) so `App` can feed the loaded definition to `ConfigPanel`.

- [ ] **Step 5: Typecheck + boot + manual check**

Run: `pnpm --filter @perimeter/studio typecheck && pnpm --filter @perimeter/studio dev`
Expected: studio boots; selecting **example** renders it live in a shadow root; editing `count`/`greeting` updates the preview; editing `color-primary` recolors it without a full remount; the component list shows the `@perimeter/ui` components.

- [ ] **Step 6: Commit**

```bash
git add studio/src
git commit -m "feat(studio): theme editor, config panel, component preview, two-pane App"
```

### Task 7.5: Studio HMR parity smoke (manual, documented)

- [ ] **Step 1:** With `pnpm --filter @perimeter/studio dev` running, edit `widgets/example/src/app.tsx` (change card text). Confirm the preview hot-updates within ~1s without a full reload.
- [ ] **Step 2:** Build the example IIFE (`pnpm --filter @perimeter/widget-example build`) and load it in the throwaway HTML from Task 6.1 Step 8. Confirm the rendered output matches the studio preview (same shadow root, same styles). Record the result in the PR description as the parity check.

---

## Chunk 8: Quality gate, docs, and PR

### Task 8.1: Green `pnpm quality` across the workspace

- [ ] **Step 1: Format**

Run: `pnpm format`

- [ ] **Step 2: Full quality gate**

Run: `pnpm quality`
Expected: PASS — `typecheck`, `lint`, `test` across `theme`, `widget-runtime`, `vite-plugin-widget`, `auth`, `api-client`, `api-hooks`, `ui`, `widget-example`, `studio`; then `format:check`.
If a Turborepo task references a removed package, fix `turbo.json`/scripts (the pipeline itself needs no change, but confirm).

- [ ] **Step 3: Commit any formatting**

```bash
git commit -am "chore(widgets): format + quality gate green for streamline foundation"
```

### Task 8.2: Update `CLAUDE.md` and add a "create a widget" doc

**Files:**
- Modify: `perimeter-widgets/CLAUDE.md`
- Create: `docs/creating-a-widget.md`

- [ ] **Step 1:** Rewrite the `CLAUDE.md` **Status**/**Commands** sections to reflect the new shape: single mount path, Vite studio (`pnpm dev` → studio), `widgetConfig` build, no `publish-widget` (Phase 3 will add the release CLI), packages list minus `release-store`/`api-types`. Point at this plan + the streamline spec. Remove references to the old phases/`apps/*`.
- [ ] **Step 2:** Write `docs/creating-a-widget.md`: copy `widgets/example`, rename, edit `widget.tsx` (name/schema/App) + `entry.ts` (none needed beyond name match) + `vite.config.ts` (`widgetConfig({ name })`), run `pnpm dev` to see it in the studio. This is the "easy for the team + Claude" on-ramp.
- [ ] **Step 3: Commit**

```bash
git add perimeter-widgets/CLAUDE.md docs/creating-a-widget.md
git commit -m "docs(widgets): document the streamlined single-mount platform + create-a-widget guide"
```

### Task 8.3: Open the PR

- [ ] **Step 1:** Push and open a PR into `dev` using `--body-file` (write the body with the Write tool; never inline). Body: summary of the foundation, the parity-check result from Task 7.5, the list of deleted packages/apps, and a note that production is unchanged (Phase 4 cutover is later).

```bash
git push -u origin feat/widgets-streamline-foundation
# then: gh pr create --base dev --title "feat(widgets): streamline foundation (single mount path + Vite studio)" --body-file <path>
```

- [ ] **Step 2:** Before requesting review, run superpowers:requesting-code-review against the diff.

---

## Done-when (Phase 1 acceptance)

- `pnpm quality` is green across all packages + the studio.
- `pnpm dev` opens the Vite studio; the `example` widget previews live through `mount()`, with working config + theme editing and HMR.
- `pnpm --filter @perimeter/widget-example build` emits a single self-contained `dist/index.js` IIFE (no separate CSS asset) that self-mounts on `data-perimeter-widget="example"` and renders identically to the studio preview.
- `release-store`, `api-types`, `apps/cdn`, `apps/studio`, `native-render.ts`, and the vite virtual-entry/CSS-placeholder code are gone.
- No production embed has changed (sermons still served by the legacy URL — that is Phase 2/4).
```
