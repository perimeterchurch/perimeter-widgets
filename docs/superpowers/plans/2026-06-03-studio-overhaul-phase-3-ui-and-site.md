# Studio Overhaul Phase 3 — Studio UI + Design-System Site Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the bare-bones studio into a polished, routed dev tool **and** the deployable design-system site for style.perimeter.org — a real sidebar with search/grouping, a preview canvas with viewport presets + background/host-sim toggle + a dev-only built-bundle check, an inspector (Config/Theme/Info), live `/tokens`, MDX-rendered component + guide pages, and a static build ready to deploy.

**Architecture:** `react-router` turns the single `studio/` Vite app into an SPA with a persistent layout shell (`Sidebar` + `<Outlet/>`); the studio chrome is built from `@perimeter/ui` (dogfooding the design system), which means the studio's **light DOM** gets a `:root` token layer (the widget shadow-DOM pipeline from Phase 1/2 is untouched). The preview canvas reuses the Phase-2 `HostFrame` for its host-sim background and the Phase-2 `ComponentStage` for parity-correct component examples. Docs are single-sourced MDX under `docs/` compiled by `@mdx-js/rollup` and discovered with `import.meta.glob`; the same files Claude reads as markdown render as live pages. Dev-only features (built-bundle preview) gate behind `import.meta.env.DEV` so the deployed site is a clean read-only gallery. Deploy is its own static Vercel project (like `widgets-cdn`), prepared here; project creation + DNS are owner-driven.

**Tech Stack:** React 19, react-router 7, `@mdx-js/rollup` + `@mdx-js/react`, Vite 6, Tailwind 3 (studio config, with the Phase-2 rem→px pipeline), `@perimeter/ui`, `@perimeter/theme`, vitest + happy-dom + @testing-library/react. Spec: `docs/superpowers/specs/2026-06-02-studio-design-system-dx-overhaul-design.md` (Phases 2–3 section). Builds on the merged Phase 1+2 work (PRs #77/#79).

---

## Context for a zero-context engineer

The studio today (`studio/src/`) is a single hardcoded 3-column `App.tsx`: a nav of plain text buttons, a `<main>` that mounts the selected `WidgetPreview` (or `ComponentPreview`), and an `<aside>` with `ConfigPanel` + `ThemeEditor`. Discovery (`studio/src/lib/discovery.ts`) auto-finds widgets (`widgets/*/src/widget.tsx` + `styles.css?inline`) and components (`packages/ui/src/*.tsx`) via `import.meta.glob` (globs are relative to the importing file — `../../../` reaches repo root; never `/…`). Previews go through the **real** `mount()` (shadow DOM, parity-correct). Phase 2 already added: `HostFrame` (wraps a preview in the measured production host-page environment — font 19px / line-height 35px / color #353535 / max-width 1425px, from `hostProfile` in `@perimeter/theme`), `ComponentStage` (mounts gallery content in a shadow root via the real `applyStyles`), and `mount()` now re-validates merged config (a bad config throws → `WidgetPreview` shows a styled error box).

Key facts that shape this plan:

- **`@perimeter/theme` exports** `globalTokens` (a `Record<ThemeToken,string>` of CSS values — colors as `hsl(...)`, radii as `px`, two font stacks), `hostProfile`, `resolveTokens`, `applyStyles` (re-exported from widget-runtime), `rewriteRootToHost`. `globalTokens` keys are like `color-primary`, `radius-md`, `font-sans`.
- **The studio chrome currently has NO token CSS variables in its light DOM.** `studio/src/styles.css` is just `@tailwind base/components/utilities`. The studio's Tailwind preset maps `bg-primary` → `var(--color-primary)`, so `@perimeter/ui` components rendered in the **chrome** (light DOM) would be unstyled until a `:root` token layer exists. (Widget/gallery previews are unaffected — they get tokens inside their shadow root via `mount`/`ComponentStage`.) Task 2 fixes this.
- **`@perimeter/ui` components** (17): `badge button card combobox empty icon-select input input-group label multi-combobox pagination skeleton skeleton-transition sort-select spinner tabs textarea`. Several require props and throw when rendered bare (`ComponentPreview` already wraps each in an `Isolate` error boundary — keep that).
- **Deployed-site rule:** anything that reads local `widgets/*/dist` (the built-bundle preview) must be gated behind `import.meta.env.DEV`. Everything else — source-mounted previews (hit the live API), config/theme panels, MDX pages, `/tokens` — ships in the deployed build.

Repo rules (apply to every task): pnpm only; never commit to `dev`/`main` (work on `feat/studio-ui`); conventional commits; `pnpm format` before `pnpm quality`; verify tests with `pnpm exec turbo run test --filter=@perimeter/studio --force` (turbo cache replays mask whether tests ran); studio runtime bugs are invisible to typecheck/build, so exercise the render path with happy-dom tests (`render.test.tsx` is the precedent). Turbo filter for the studio package is `@perimeter/studio`. PR bodies via the Write tool + `gh pr create --body-file` (never inline). Use **react-router 7** declarative APIs (`createBrowserRouter`/`RouterProvider` or `<BrowserRouter><Routes>`); pin the version installed and match its current API (verify with the installed version's types, not memory).

**Design quality bar:** the studio is the design-system showcase — it must look polished, not utilitarian. Build chrome from `@perimeter/ui`, use the token palette, get spacing/typography/hover/active/focus states right. When a task's visual design is underspecified, follow the principles in the frontend-design skill (clear hierarchy, restraint, real states) rather than shipping default-looking markup.

---

## Chunk 1: Routing, app shell, and the light-DOM token layer

### Task 1: Branch + dependencies

**Files:** `studio/package.json`

- [ ] **Step 1:** `git fetch --prune && git checkout -B feat/studio-ui origin/dev`. Confirm baseline green: `pnpm install` then `pnpm exec turbo run test --filter=@perimeter/studio --force`.
- [ ] **Step 2:** Add to `studio/package.json` dependencies: `react-router`, `@mdx-js/react`; devDependencies: `@mdx-js/rollup`, `@types/mdx`. Use `pnpm --filter @perimeter/studio add react-router @mdx-js/react` and `pnpm --filter @perimeter/studio add -D @mdx-js/rollup @types/mdx`. **Record the resolved `react-router` major version** from `studio/package.json` — every routing task must match that version's actual API (read `node_modules/react-router/dist/*.d.ts` if unsure; do NOT assume v6 vs v7 syntax from memory).
- [ ] **Step 3:** Commit: `chore(studio): add react-router + mdx deps`. Include `pnpm-lock.yaml`.

### Task 2: Light-DOM token layer (so `@perimeter/ui` chrome renders)

**Files:** Create `studio/src/lib/light-dom-tokens.ts`; modify `studio/src/main.tsx`; test `studio/src/lib/light-dom-tokens.test.ts`

- [ ] **Step 1: Failing test** — assert the helper produces a `:root { … }` string containing one custom property per `globalTokens` entry with its value:

```ts
import { describe, expect, it } from 'vitest';
import { globalTokens } from '@perimeter/theme';
import { rootTokenCss } from './light-dom-tokens';

describe('rootTokenCss', () => {
  it('emits every global token as a :root custom property', () => {
    const css = rootTokenCss();
    expect(css.startsWith(':root {')).toBe(true);
    for (const [k, v] of Object.entries(globalTokens)) {
      expect(css).toContain(`--${k}: ${v};`);
    }
  });
});
```

- [ ] **Step 2:** Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → FAIL (module missing).
- [ ] **Step 3: Implement** `light-dom-tokens.ts`:

```ts
import { globalTokens } from '@perimeter/theme';

/**
 * The global design tokens as a `:root` rule for the studio's LIGHT DOM, so the
 * studio chrome (built from @perimeter/ui) resolves `var(--color-*)`/`var(--radius-*)`.
 * Widget + gallery PREVIEWS are unaffected — they receive tokens inside their shadow
 * root via mount()/ComponentStage. This is chrome-only.
 */
export function rootTokenCss(): string {
  const decls = Object.entries(globalTokens)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
  return `:root {\n${decls}\n}`;
}

/** Inject the token layer once into <head>. Idempotent. */
export function installRootTokens(doc: Document = document): void {
  if (doc.getElementById('studio-root-tokens')) return;
  const style = doc.createElement('style');
  style.id = 'studio-root-tokens';
  style.textContent = rootTokenCss();
  doc.head.appendChild(style);
}
```

- [ ] **Step 4:** In `main.tsx`, call `installRootTokens()` before `createRoot(...).render(...)`. (Keep `import './styles.css'`.)
- [ ] **Step 5:** Run tests → PASS. Manual smoke deferred to Task 3 (need a rendered `@perimeter/ui` element to eyeball).
- [ ] **Step 6:** Commit: `feat(studio): light-DOM :root token layer so ui chrome resolves theme vars`.

### Task 3: Router + layout shell + Sidebar

**Files:** Create `studio/src/routes.tsx`, `studio/src/components/Layout.tsx`, `studio/src/components/Sidebar.tsx`; rewrite `studio/src/main.tsx` (mount the router) and slim `studio/src/App.tsx` (or delete it in favor of route components in Task 4); test `studio/src/components/Sidebar.test.tsx`

- [ ] **Step 1: Nav-data helper.** Sidebar needs grouped, searchable nav. Add to `discovery.ts` (or a new `studio/src/lib/nav.ts`) a pure function `buildNav(widgets, components)` returning groups: `[{ label: 'Widgets', items: [{ to: '/widgets/<slug>', label }] }, { label: 'Components', items: [{ to:'/components/<name>', label }] }, { label:'Reference', items:[{to:'/tokens',label:'Tokens'}, {to:'/guides/<slug>',label} per discovered guide] }]`. Guides are discovered in Chunk 3; for now include the static `Tokens` entry and leave guide discovery to Task 12 (the function takes a `guides` arg defaulting to `[]`).
- [ ] **Step 2: Failing test** (`Sidebar.test.tsx`, happy-dom): render `<MemoryRouter><Sidebar nav={fixtureNav} /></MemoryRouter>`; assert (a) each group label renders, (b) typing in the search input filters items (e.g. type "serm" → only the sermons link shows), (c) the link for the current route has an active marker (`aria-current="page"` via `NavLink`). Use the react-router version's `MemoryRouter`/`NavLink`.
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Implement** `Sidebar.tsx`: a styled sidebar built from `@perimeter/ui` (`Input` for search, your own nav list). Group headers, `NavLink` items with active styling (`aria-current` + a visual active state via the token palette), a controlled search `useState` that filters items case-insensitively by label, and an empty-state line ("No matches") when filtered to nothing. Collapse behavior on narrow viewports: a toggle button that hides the nav (CSS/`useState`); keep it simple and accessible (button with `aria-expanded`).
- [ ] **Step 5: Implement** `Layout.tsx`: `<div className="grid h-screen grid-cols-[16rem_1fr]"><Sidebar/><main className="overflow-auto"><Outlet/></main></div>` — the persistent shell (JSX `className`, not `class`). (The inspector lives inside the widget route, not the global shell, because only widget pages have config/theme.)
- [ ] **Step 6: Wire the router** in `main.tsx`: define routes (`/` index, `/widgets/:slug`, `/components/:name`, `/tokens`, `/guides/:slug`, `*` not-found) under `Layout`. Route element bodies can be thin placeholders importing the Task-4 page components (create empty stubs now so it compiles; Task 4 fills them). Use the installed react-router version's router API.
- [ ] **Step 7:** Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → PASS. Manual smoke: `pnpm --filter @perimeter/studio dev` → sidebar is styled (token colors visible = Task 2 works), search filters, clicking items changes the route.
- [ ] **Step 8:** Commit: `feat(studio): react-router shell with searchable grouped sidebar`.

### Task 4: Route pages — migrate existing widget/component views

**Files:** Create `studio/src/pages/Overview.tsx`, `studio/src/pages/WidgetPage.tsx`, `studio/src/pages/ComponentPage.tsx`, `studio/src/pages/NotFound.tsx`; update `routes`/`main.tsx`; delete the old `App.tsx` if fully superseded; test `studio/src/pages/WidgetPage.test.tsx`

- [ ] **Step 1: Failing test** (`WidgetPage.test.tsx`): render the app at `/widgets/example` via `MemoryRouter` with `initialEntries`; assert the widget preview host (`[data-perimeter-widget-preview]`) is present and the embed snippet `<pre>` shows the `example` snippet. Carry the exact snippet text over from the current `App.tsx` (`https://widgets.perimeter.org/<slug>/latest.js`) — assert against that real host/path, don't invent one. (Reuse the discovery globs — they resolve against repo root in tests too.)
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** the pages, preserving today's behavior under routes:
  - `WidgetPage`: read `:slug` via the router's `useParams`; find the discovered widget; render `WidgetPreview` (Task 5–8 add the canvas/inspector around it — for now keep the current `WidgetPreview` + config/theme/embed exactly as `App.tsx` has them, just relocated). 404 to `NotFound` if the slug is unknown.
  - `ComponentPage`: `:name` → discovered component → `ComponentPreview` (already shadow-correct). 404 if unknown. (MDX-or-gallery split lands in Task 11; for now always the gallery.)
  - `Overview` (`/`): a simple landing — title, short blurb, counts/links to widgets & components (dogfood `@perimeter/ui` `Card`).
  - `NotFound`: styled 404 with a link home.
- [ ] **Step 4:** Delete `App.tsx` and its test usage if nothing else imports it (grep first); move any still-needed bits into pages. Keep `ConfigPanel`/`ThemeEditor`/`WidgetPreview`/`ComponentPreview` components.
- [ ] **Step 5:** Run tests → PASS (including the existing `render.test.tsx` + `discovery.test.ts`). Manual smoke: every route renders; previews still mount through the real `mount()`.
- [ ] **Step 6:** Commit: `feat(studio): route pages for overview/widget/component/404`.

---

## Chunk 2: Preview canvas + inspector

### Task 5: Canvas viewport presets

**Files:** Create `studio/src/components/Canvas.tsx`; update `WidgetPage`; test `studio/src/components/Canvas.test.tsx`

- [ ] **Step 1: Failing test:** render `<Canvas>` with children; assert (a) preset buttons (Mobile 375 / Tablet 768 / Desktop 1280 / Fluid) render, (b) clicking "Mobile" sets the preview container's `style.width` (or `max-width`) to `375px`, (c) "Fluid" removes the width constraint, (d) a custom width number input overrides to its value.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `Canvas.tsx`: a toolbar (built from `@perimeter/ui` `Button`/`Input`) + a centered preview frame whose width is controlled by `useState<{ preset; customPx }>`. Presets: `{ Mobile: 375, Tablet: 768, Desktop: 1280, Fluid: null }`. The frame wraps `children` (the preview) in a `div` with `style={{ width, marginInline: 'auto' }}` (or `maxWidth` for Fluid-with-cap). Show the current px width as a label. Custom px input is a controlled number that, when set, takes precedence and highlights as active.
- [ ] **Step 4:** Use it in `WidgetPage`: wrap `WidgetPreview` in `<Canvas>`. Run tests → PASS. Smoke: presets visibly resize the preview.
- [ ] **Step 5:** Commit: `feat(studio): canvas viewport presets + custom width`.

### Task 6: Canvas background toggle (incl. host-sim) + error surface

**Files:** Update `studio/src/components/Canvas.tsx`; test additions in `Canvas.test.tsx`

- [ ] **Step 1: Failing test:** add cases — background toggle offers White / Gray / Dark / Host-sim; selecting a background sets the canvas surface (assert a class or inline `background`); selecting **Host-sim** wraps the preview in the Phase-2 `HostFrame` (assert a `[data-host-frame]` ancestor appears around the children when host-sim is active, and is absent otherwise).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement:** add a `background` control (segmented buttons) to the toolbar: `white` (#fff), `gray` (a neutral token/`#f3f4f6`), `dark` (a dark neutral). The **host-sim** option conditionally renders `<HostFrame>{children}</HostFrame>` instead of the plain surface — this is the production-truth canvas using the measured `hostProfile`. Keep width (Task 5) working in all backgrounds. Note for the implementer: host-sim already sets its own background/typography via `HostFrame`; the white/gray/dark options are the neutral inspection surfaces.
- [ ] **Step 4:** Run → PASS. Smoke: switching to Host-sim shows the widget in the 19px/35px production rhythm (matches the Phase-2 finding); dark surface helps spot transparent edges.
- [ ] **Step 5:** Commit: `feat(studio): canvas background toggle with production host-sim`.

### Task 7: Dev-only built-bundle preview (iframe)

**Files:** Create `studio/src/components/BuiltBundlePreview.tsx`; create `studio/src/lib/built-bundles.ts`; update `Canvas`/`WidgetPage`; test `studio/src/components/BuiltBundlePreview.test.tsx`

Rationale for an iframe: the built IIFE calls `autoMount`, which observes `document.body` globally and instantiates its own React — running it in the studio's own document would collide. An iframe fully isolates it and is the parity-honest way to preview the actual shipped artifact. This whole feature is **DEV-only** (`import.meta.env.DEV`); it must not appear in the deployed build.

- [ ] **Step 1: Built-bundle discovery** in `built-bundles.ts`:

```ts
// URLs of each widget's built IIFE, keyed by slug. `?url` gives a dev-server URL
// to the file on disk; eager so the map is sync. DEV-only — dist may not exist.
const urls = import.meta.glob('../../../widgets/*/dist/index.js', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function builtBundleUrl(slug: string): string | null {
  const hit = Object.entries(urls).find(([p]) => p.includes(`/widgets/${slug}/dist/`));
  return hit ? hit[1] : null;
}
```

- [ ] **Step 2: Failing test:** `BuiltBundlePreview` with a known slug renders an `<iframe>` whose `srcdoc` contains `data-perimeter-widget="<slug>"` and a `<script src=...>`; with an unknown slug (no dist) it renders a "build the widget first" hint, not a broken frame. (Mock `builtBundleUrl` via `vi.mock` so the test doesn't depend on a real dist.)
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Implement** `BuiltBundlePreview.tsx`: given `slug`, resolve `builtBundleUrl`; if null, render a hint (`pnpm --filter ./widgets/<slug> build`). Else render an `<iframe>` with `srcDoc` = a minimal HTML doc containing `<div data-perimeter-widget="${slug}"></div><script src="${url}"></script>` and a `title` for a11y. Size the iframe to the canvas width.
- [ ] **Step 5: Wire into `Canvas`** behind a DEV gate: add a **Source ⇄ Built** toggle to the toolbar **only when `import.meta.env.DEV`**; when "Built" is selected, render `<BuiltBundlePreview slug=…/>` instead of the source `children`. `WidgetPage` passes the slug. In a production build the toggle and component tree-shake out (guard the import/usage with `import.meta.env.DEV` so Rollup drops it).
- [ ] **Step 6:** Run tests → PASS. Smoke (DEV): build a widget (`pnpm --filter ./widgets/example build`), toggle to Built → the real shipped IIFE renders in the iframe; toggle to Source → the live-mount returns. Verify the toggle is **absent** in a prod build: `pnpm --filter @perimeter/studio build` then grep the output for "Built" toolbar text / `BuiltBundlePreview` — should be gone.
- [ ] **Step 7:** Commit: `feat(studio): dev-only built-bundle iframe preview`.

### Task 8: Inspector — Config / Theme / Info tabs

**Files:** Create `studio/src/components/Inspector.tsx`; update `ThemeEditor.tsx` (reset-to-default); create `studio/src/components/InfoPanel.tsx`; update `WidgetPage`; test `studio/src/components/Inspector.test.tsx`

- [ ] **Step 1: Failing test:** `Inspector` (given a widget definition + config/theme state) renders three tabs (Config / Theme / Info) using `@perimeter/ui` `Tabs`; switching tabs shows the right panel; the Info tab lists the schema fields with their types + defaults; the Theme tab has a "Reset" control that clears overrides (assert `onChange` called with `{}`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement:**
  - `Inspector.tsx`: `@perimeter/ui` `Tabs` (a Base UI compound — `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, **value-based**: pass a `defaultValue` and matching `value` strings to each `TabsTrigger`/`TabsContent`, NOT a Radix-style index/onChange API) with three panels. Config = existing `ConfigPanel`. Theme = `ThemeEditor`. Info = `InfoPanel`. The test should query triggers by their visible label/role.
  - `ThemeEditor`: add a "Reset to defaults" button calling `onChange({})`; keep the existing per-token inputs (they already drive `updateTokens`). Optionally group color vs radius vs font for readability.
  - `InfoPanel.tsx`: render widget meta from the definition — `name`, `auth` mode, and a table of schema fields (key, zod type name, default) derived by unwrapping `definition.schema` (reuse the `unwrapObject` logic that `ConfigPanel` already has — extract it to `studio/src/lib/schema-shape.ts` and import in both, rather than duplicating). Include the production embed snippet. (Do NOT attempt live gz bundle size — it isn't available in the dev studio; that belongs to a generated manifest, out of scope.)
- [ ] **Step 4:** Replace the `WidgetPage` aside with `<Inspector/>`. Run tests → PASS (existing `ConfigPanel` behavior preserved via the extracted helper). Smoke: tabs switch; reset clears theme; Info shows schema.
- [ ] **Step 5:** Commit: `feat(studio): inspector tabs (config/theme/info) with theme reset`.

---

## Chunk 3: MDX infrastructure + content pages

### Task 9: MDX rollup setup + provider + discovery

**Files:** `studio/vite.config.ts`; create `studio/src/lib/mdx.tsx` (MDX components + provider); test `studio/src/lib/mdx.test.tsx`

- [ ] **Step 1:** Add `@mdx-js/rollup` to `studio/vite.config.ts` plugins. **Ordering matters:** MDX must run before `@vitejs/plugin-react` for JSX in `.mdx` to transform. Use:

```ts
import mdx from '@mdx-js/rollup';
// ...
plugins: [
  { enforce: 'pre', ...mdx({ providerImportSource: '@mdx-js/react' }) },
  react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }), // include MDX so React transform + Fast Refresh apply to MDX-emitted JS
],
```

The current config has a bare `react()` (`studio/vite.config.ts:12`) — it MUST gain the `include` option above, or MDX-derived JSX/refresh is inconsistent. Keep the Phase-2 inline PostCSS (`tailwindcss() + autoprefixer() + remToPxPlugin`) and `server.fs.allow` exactly as they are.
- [ ] **Step 2:** Add an `*.mdx` type shim so TS accepts MDX imports — in `studio/src/env.d.ts` (currently just `/// <reference types="vite/client" />`) add: `declare module '*.mdx' { import type { ComponentType } from 'react'; const C: ComponentType; export default C; }`. This shim is **required** — `@types/mdx` provides `mdx/types` but does NOT declare `*.mdx` modules, so it cannot substitute for the shim.
- [ ] **Step 3: Failing test** (`mdx.test.tsx`): render a tiny inline MDX-produced component wrapped in the studio `MDXProvider`, asserting a custom mapped element renders (e.g. that an `<h1>` in MDX gets the studio's styled heading). Since you can't easily author a `.mdx` fixture inside a unit test, instead unit-test the **components map** object directly: assert `mdxComponents.h1`, `.code`, `.a`, and the live-example components (`ComponentStage`) are present and are functions/components.
- [ ] **Step 4: Implement** `mdx.tsx`: export `mdxComponents` — a map styling base MDX elements (`h1/h2/h3/p/ul/li/code/pre/a/table`) with the token palette + `@perimeter/ui` where natural, **plus** the live-doc building blocks authors use in `.mdx`: `ComponentStage` (re-export) and a small `<Example>` wrapper (renders children inside a `ComponentStage` with a label) so component docs show real, parity-correct examples. Export a `StudioMDXProvider` that wraps children in `@mdx-js/react`'s `MDXProvider` with `components={mdxComponents}`.
- [ ] **Step 5:** Run `pnpm exec turbo run test --filter=@perimeter/studio --force` → PASS, and `pnpm --filter @perimeter/studio build` → succeeds (proves the rollup plugin is wired). 
- [ ] **Step 6:** Commit: `feat(studio): mdx pipeline + provider with live-example components`.

### Task 10: `/tokens` live design-token reference

**Files:** Create `studio/src/pages/TokensPage.tsx`; test `studio/src/pages/TokensPage.test.tsx`

- [ ] **Step 1: Failing test:** render `TokensPage`; assert (a) every `color-*` token renders a swatch with its var name + value, (b) `radius-*` tokens render with a visual radius sample, (c) `font-*` tokens render their stack in that font. Drive assertions from `globalTokens` (no hard-coded counts).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement** `TokensPage.tsx`: read `globalTokens`, partition by prefix (`color-`, `radius-`, `font-`), and render three sections: color swatches (a colored chip using `background: var(--<token>)` — works because Task 2 put the vars on `:root`), the css var name, and the literal value; radii as boxes with `border-radius: var(--<token>)`; font stacks rendered in `font-family: var(--<token>)`. Add a short intro paragraph on per-embed overriding (`data-theme-*` attributes / `updateTokens`). Polished, dogfooding `@perimeter/ui` `Card`/`Badge`.
- [ ] **Step 4:** Run → PASS. Smoke: `/tokens` shows the real palette.
- [ ] **Step 5:** Commit: `feat(studio): live /tokens design-token reference`.

### Task 11: `/components/:name` — MDX doc or gallery fallback + seed docs

**Files:** Create `docs/components/button.mdx`, `docs/components/badge.mdx`, `docs/components/card.mdx`; update `studio/src/pages/ComponentPage.tsx`; create `studio/src/lib/component-docs.ts`; test update in `studio/src/pages/ComponentPage.test.tsx`

- [ ] **Step 1: Doc discovery** in `component-docs.ts`: `import.meta.glob('../../../docs/components/*.mdx')` (lazy) → a `Record<name, () => Promise<{default: ComponentType}>>` keyed by basename. Export `componentDoc(name): loader | null`.
- [ ] **Step 2: Failing test:** for a component WITH a doc (`button`), `ComponentPage` renders the MDX (assert text unique to the mdx file appears); for one WITHOUT (`spinner`), it falls back to the auto `ComponentPreview` gallery. (Mock `componentDoc` so the test isn't order-dependent on real files, OR assert against the real seed docs created in Step 4 — pick one and be consistent.)
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Implement.** `ComponentPage`: if `componentDoc(name)` exists, lazy-load it and render inside `<StudioMDXProvider>` (Suspense + a spinner); else render the existing `ComponentPreview` gallery (still parity-correct via `ComponentStage`). Author the three seed `.mdx` docs — each: a one-line purpose, an `<Example>` with a real usage (props filled so it doesn't throw), and a short props list. These prove the pipeline and are the template for Phase 5's full coverage. Keep them accurate to the actual component APIs (read each component's props first).
- [ ] **Step 5:** Run → PASS. Smoke: `/components/button` shows the doc + live example in a shadow root; `/components/spinner` shows the gallery.
- [ ] **Step 6:** Commit: `feat(studio): component pages render MDX docs with gallery fallback`.

### Task 12: `/widgets/:slug` optional MDX + `/guides/:slug` + seed guide

**Files:** Create `docs/guides-mdx/styling-widgets.mdx` (seed); create `studio/src/lib/guide-docs.ts`; create `studio/src/pages/GuidePage.tsx`; update `WidgetPage` (optional MDX section), `Sidebar` nav (guide entries), `routes`; test `studio/src/pages/GuidePage.test.tsx`

Note on directory: keep authored MDX guides in a dedicated `docs/guides-mdx/` to avoid colliding with the existing legacy `docs/guides/*.md` (which Phase 5 audits/removes). Phase 5 will consolidate; Phase 3 only needs a working pipeline + one real guide.

- [ ] **Step 1: Guide discovery** in `guide-docs.ts`: glob `../../../docs/guides-mdx/*.mdx` → list of `{ slug, title, load }` (derive `slug` from filename; derive `title` from the filename or a frontmatter-free first-`# ` — simplest: prettify the slug). Export `listGuides()` and `guideDoc(slug)`.
- [ ] **Step 2: Failing test** (`GuidePage.test.tsx`): at `/guides/styling-widgets`, the seed guide's content renders inside the MDX provider; an unknown slug renders `NotFound`.
- [ ] **Step 3:** Run → FAIL.
- [ ] **Step 4: Implement** `GuidePage` (lazy-load `guideDoc(slug)` in `StudioMDXProvider`, 404 if missing). Wire `listGuides()` into `buildNav` (Task 3's `guides` arg) so guides appear under the Reference group. Add the `/guides/:slug` route. In `WidgetPage`, if `docs/widgets/<slug>.mdx` exists (reuse a small glob like the component-docs one), render it below the canvas — else nothing. Author `docs/guides-mdx/styling-widgets.mdx`: a real, accurate starter guide (tokens-first styling, when to use `@perimeter/ui` vs custom, the rem→px/shadow-DOM facts from the parity work) with at least one `<Example>`. This is genuine content Phase 5 builds on, not lorem ipsum.
- [ ] **Step 5:** Run → PASS. Smoke: guide appears in the sidebar and renders; a widget with a doc shows it.
- [ ] **Step 6:** Commit: `feat(studio): guide pages + optional widget docs (mdx), seed styling guide`.

---

## Chunk 4: Deploy preparation + finalize

### Task 13: Production-build gating + `vercel.json`

**Files:** Create `studio/vercel.json`; audit dev-only gates; verify the static build

- [ ] **Step 1: Audit DEV gates.** Confirm the only `import.meta.env.DEV`-gated feature is the built-bundle preview (Task 7). Everything else must work statically. Build: `pnpm --filter @perimeter/studio build` → `studio/dist` with an `index.html`. Serve it (`pnpm --filter @perimeter/studio exec vite preview` or `npx serve studio/dist`) and click every route — widget previews mount (against the live `https://api.perimeter.org`), `/tokens`, components, guides all render; the Source⇄Built toggle is **absent**.
- [ ] **Step 2: SPA fallback + headers** — `studio/vercel.json`. Unlike `cdn/` (a no-build static dir), the studio is a real Vite build that NEEDS the monorepo to compile, so this is a framework build, not `framework:null`. Keep it minimal and let Vercel detect Vite, but pin the SPA rewrite:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }]
}
```

(Vite emits hashed files under `/assets/`; the negative-lookahead keeps those served directly while every app route falls back to `index.html`. Verify the actual asset dir name from the build output and adjust the pattern if Vite uses a different prefix.)
- [ ] **Step 3:** Run `pnpm format && pnpm quality` → green. Commit: `chore(studio): vercel SPA config + verified static build`.

### Task 14: Deploy runbook + render guards + final review + PR

**Files:** Create `docs/deploying-studio.md`; add any missing render tests; PR

- [ ] **Step 1: Deploy runbook** `docs/deploying-studio.md` — the owner-driven steps (mirror the `widgets-cdn` gotchas, but note the studio DIFFERS: it needs the monorepo to build):
  - New Vercel project, **Root Directory = repo root** (NOT `studio`), Framework = Vite, Build Command `pnpm --filter @perimeter/studio build`, Output Directory `studio/dist`, Install `pnpm install`. ("Include files outside Root Directory" is moot when root = repo root.) These are **dashboard-only** settings — `vercel.json` cannot express Root Directory or the build/output dirs for a monorepo subpackage; the runbook must say so explicitly.
  - Domain `style.perimeter.org` (DNS owner-driven).
  - Auto-deploys from `main` like the CDN; preview deploys per PR.
  - A post-deploy smoke checklist (routes load, a widget mounts against prod API, `/tokens` renders).
- [ ] **Step 2: Render-guard sweep.** Ensure happy-dom tests cover each new route page at least at smoke level (Sidebar, WidgetPage, ComponentPage, TokensPage, GuidePage) — studio runtime bugs don't show in typecheck/build (the documented reason `render.test.tsx` exists). Add any missing smoke test. Run the full studio suite `--force`.
- [ ] **Step 3: Full gate:** `pnpm format`, `pnpm quality`, `pnpm exec turbo run test --filter=@perimeter/studio --force`, and `pnpm --filter @perimeter/studio build`. All green.
- [ ] **Step 4: PR.** Push `feat/studio-ui`; write the PR body with the Write tool (the new studio capabilities, the MDX content model, how to run it, the deploy-runbook pointer, and that style.perimeter.org project creation + DNS are owner-driven) and `gh pr create --base dev --body-file …`. Do NOT merge.
- [ ] **Step 5:** Report the PR URL. Note for the user: the deployed design-system site goes live only after they create the Vercel project per `docs/deploying-studio.md` + point DNS.

---

## Execution notes

- Tasks are sequential within the shared working tree; Chunk 2 depends on Chunk 1's `WidgetPage`/`Canvas` seam, Chunk 3 on the router + MDX.
- The deployed build must stay a clean read-only gallery: the built-bundle preview is the only DEV-only feature; if any later task adds something that touches local files or local-only state, gate it behind `import.meta.env.DEV` and note it in Task 13's audit.
- Out of scope (later phases): the `create-widget` scaffolder + one-command release (Phase 4); the full guide/component-doc content set + the end-to-end `creating-a-widget` skill + the stale-docs audit/CLAUDE.md rewrite (Phase 5). Phase 3 ships the *infrastructure* + seed content that proves it.
- Design quality is a first-class acceptance criterion here (this IS the design-system site) — reviewers should weigh polish, not just function.
