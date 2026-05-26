# Perimeter Widgets — Phase 1: Foundation Design

**Status:** Proposed
**Date:** 2026-05-22
**Author:** parkerb@perimeter.org (with Claude)
**Umbrella:** `2026-05-22-perimeter-widgets-rebuild-design.md`

## Purpose

Stand up the new perimeter-widgets monorepo as a runnable, verifiable foundation. End state: an empty platform that builds, lints, types, and tests cleanly; a Studio app that renders a built-in example widget in both native and as-shipped modes; and the platform packages required to support that flow.

This phase intentionally excludes hosting, the release flow, the admin UI, the loader script, the sermons port, the form helper, and cross-embed shared state. Those land in later phase specs.

## Goals

1. Turborepo monorepo set up with the package layout from the umbrella.
2. Tooling baseline: TypeScript strict, ESLint, Prettier, Vitest, all wired through Turborepo. `pnpm quality` (typecheck + lint + format + test) passes from a clean clone.
3. `@perimeter/theme` package: token source, Tailwind preset, runtime CSS-variable resolver.
4. `@perimeter/ui` package: a small starter set of components (`Button`, `Card`, `Input`, `Label`, `Skeleton`) sufficient to demo the design system.
5. `@perimeter/auth` package: `AuthProvider` interface + `MPLocalStorageAuth` implementation.
6. `@perimeter/api-client` package: hand-written `fetch` wrapper with auth-header injection. Surface is empty besides the `apiFetch(path, init)` core; per-endpoint functions are added by later phases as needed.
7. `@perimeter/widget-runtime` package: `defineWidget`, `mountWidget`, providers (`ThemeProvider`, `AuthProvider`, `AuthGate`, `QueryClientProvider`), `ErrorBoundary`, shadow-root attach + token CSS injection, `data-*` parse, `MutationObserver`-based late mounting, and a `nativeRender` entry point used by Studio.
8. `@perimeter/vite-plugin-widget`: the build-time plugin that turns a `defineWidget` default export into an IIFE.
9. `widgets/example/`: a minimal demo widget that exercises the contract — no real API calls, no auth required, configurable via two `data-*` attrs. Lives in the repo to validate the platform and serves as the template for future widgets.
10. `apps/studio` shell: Next.js 16 app with three working sections — `/components/<slug>` (live previews + prop controls), `/widgets/<slug>` (native + as-shipped toggle for the example widget), `/theme` (live token editor). Auth-gated `/admin/*` is stubbed but not implemented.

## Non-goals for Phase 1

- `apps/cdn`, Vercel Blob, KV pointers, release flow, admin UI — Phase 3.
- Loader script and `manifest.json` — Phase 3.
- Sermons port — Phase 2.
- `@perimeter/form` and `@perimeter/shared-state` — deferred until a widget needs them.
- Bundle hosted publicly anywhere; Phase 1's bundles live only in local `dist/`.
- Optimistic mutation / mutation queue helpers in the runtime — deferred until a widget needs them.

## Package interfaces

This section names the public surface of every Phase 1 package. Anything not listed is internal.

### `@perimeter/theme`

```ts
// Source-of-truth tokens.
export const globalTokens: Record<string, string>;
export type ThemeToken = keyof typeof globalTokens;

// Used by the runtime: resolves overrides and returns the CSS-variable string.
// All override maps are partial; later args override earlier ones (last write wins).
// `dataAttrOverrides` accepts raw attribute names (e.g. 'data-theme-color-primary'); the
// resolver strips the `data-theme-` prefix and drops unknown tokens with a console warning.
export function resolveTokens(args: {
  widgetOverrides?:    Partial<Record<ThemeToken, string>>;
  dataAttrOverrides?:  Record<string, string>;
  runtimeOverrides?:   Partial<Record<ThemeToken, string>>;   // applied last; used by Studio editor
}): { cssText: string; tokens: Record<ThemeToken, string> };

// Tailwind preset entry: `import preset from '@perimeter/theme/tailwind'`
export const tailwindPreset: TailwindConfig;
```

### `@perimeter/ui`

Components are independent React modules. No barrel export; widgets import each component by path so the bundler tree-shakes effectively.

```ts
// @perimeter/ui/button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}
export function Button(props: ButtonProps): JSX.Element;
```

Phase 1 ships: `Button`, `Card`, `Input`, `Label`, `Skeleton`. Each component file's only monorepo imports are `@perimeter/theme` (for tokens via Tailwind classes) and, where relevant, one Radix peer primitive.

### `@perimeter/auth`

```ts
export interface AuthProvider {
  getToken():        string | null;
  isAuthenticated(): boolean;
  onChange(cb: (token: string | null) => void): () => void;
}

export class MPLocalStorageAuth implements AuthProvider {
  constructor(options?: { tokenKey?: string; expiresKey?: string; pollIntervalMs?: number });
  // tokenKey default: 'mpp-widgets_AuthToken'
  // expiresKey default: 'mpp-widgets_ExpiresAfter'
  // pollIntervalMs default: 1000 (used as fallback when 'storage' event is not enough)
}
```

The runtime instantiates one `AuthProvider` per widget instance and exposes it through `useAuth()`.

### `@perimeter/api-client`

```ts
export interface ApiClientConfig {
  baseUrl: string;          // e.g. 'https://api.perimeter.org'
  auth?: AuthProvider;      // optional; only required if the widget needs auth
}

export function createApiClient(config: ApiClientConfig): {
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
};
```

Phase 1 stops here. Per-endpoint functions (`getSermons`, etc.) are added when the widget that needs them is built.

### `@perimeter/widget-runtime`

```ts
// Widget authoring API.
export interface DefineWidgetOptions<Schema extends z.ZodTypeAny> {
  name:            string;
  auth:            'required' | 'optional' | 'none';
  schema:          Schema;
  themeOverrides?: Partial<Record<ThemeToken, string>>;
  App:             React.ComponentType<{ config: z.infer<Schema>; auth: AuthProvider }>;
}
export interface WidgetDefinition<Schema extends z.ZodTypeAny = z.ZodTypeAny> {
  name:            string;
  auth:            'required' | 'optional' | 'none';
  schema:          Schema;
  themeOverrides?: Partial<Record<ThemeToken, string>>;
  App:             React.ComponentType<any>;
}
export function defineWidget<S extends z.ZodTypeAny>(opts: DefineWidgetOptions<S>): WidgetDefinition<S>;

// Lower-level mount/unmount used by the generated IIFE AND by Studio's native renderer.
export interface MountOptions {
  definition:        WidgetDefinition;
  target:            HTMLElement;
  configOverrides?:  Record<string, unknown>;        // merged on top of parsed data-* config
  apiBaseUrl?:       string;                          // defaults to a baked-in constant
  authFactory?:      () => AuthProvider;              // defaults to () => new MPLocalStorageAuth()
}
export interface MountedWidget {
  unmount(): void;
}
export function mountWidget(opts: MountOptions): MountedWidget;

// Scans the document for `<div data-perimeter-widget="<name>">` targets and mounts each.
// Called automatically by the generated IIFE entry. Idempotent per (definition, target) pair.
export function autoMount(definition: WidgetDefinition): void;

// Studio's native renderer. Equivalent to mountWidget but is React-only (no shadow-root injection
// for the React tree itself — it still uses a shadow root for style isolation, but the React tree
// is owned by the host app so HMR and DevTools work).
export function nativeRender(opts: MountOptions & { hostRoot: HTMLElement }): MountedWidget;

// Hook surface inside widget components.
export function useAuth(): AuthProvider;
export function useApiClient(): ReturnType<typeof createApiClient>;

// Runtime-side global surface, written to `window.PerimeterWidgets` by the IIFE.
// Studio (and any other host) reads this to drive as-shipped widgets after script load.
export interface PerimeterWidgetsGlobal {
  // Map of name → definition, populated by each loaded widget bundle.
  [name: string]: WidgetDefinition;
  // Re-resolve theme tokens for all live instances of `name` using the given overrides.
  // Studio calls this when the user edits a token; in production it is unused.
  applyOverrides(name: string, overrides: Partial<Record<ThemeToken, string>>): void;
  // Manual mount escape hatch. Returns the live MountedWidget.
  mount(name: string, target: HTMLElement, configOverrides?: Record<string, unknown>): MountedWidget;
}
declare global {
  interface Window { PerimeterWidgets: PerimeterWidgetsGlobal }
}
```

Internal modules (not exported): the providers themselves, `<ErrorBoundary>`, `<AuthGate>`, the `MutationObserver` driver, the `data-*` parser. They are exercised only through the mount/autoMount/nativeRender entry points and through the `window.PerimeterWidgets` surface above.

**Live-instance registry.** The runtime keeps a per-name registry of `MountedWidget` instances internally. `autoMount` registers each instance; `mountedWidget.unmount()` deregisters. `applyOverrides` iterates the registry for the given name and re-runs token resolution on each shadow root.

### `@perimeter/vite-plugin-widget`

```ts
export interface PerimeterWidgetPluginOptions {
  entry?:  string;          // default: 'src/index.ts'
  globalName?: string;      // default: derived from package.json `name` → `PerimeterWidget_<slug>`
}
export function perimeterWidget(options?: PerimeterWidgetPluginOptions): Plugin;
```

Codegen mechanism — what the plugin does at build time:

1. Reads the consumer's `package.json` for `name` and `version`.
2. Resolves the entry module (defaults to `src/index.ts`).
3. Creates a virtual module `\0perimeter-widget-entry` whose source is:

   ```ts
   // CSS string is built by Vite's pipeline; ?inline returns its text content.
   import widgetCss from 'virtual:perimeter-widget-css?inline';
   import definition from '<resolved entry>';
   import { autoMount, registerCss, ensureGlobal } from '@perimeter/widget-runtime';

   const def = { ...definition, version: '<package.json version>' };
   registerCss(def.name, widgetCss);          // runtime stores CSS keyed by widget name
   ensureGlobal(def);                         // populates window.PerimeterWidgets[def.name] + applyOverrides + mount
   autoMount(def);                            // scans + mounts existing targets + sets up MutationObserver
   ```

4. Emits a companion virtual module `virtual:perimeter-widget-css` whose source is `import 'tailwindcss/utilities'` plus any user-imported CSS — the standard Vite CSS graph entry for the widget. Vite resolves `?inline` against this module and returns the concatenated, processed CSS as a string. `cssCodeSplit: false` keeps the result single-file.
5. Configures Vite for library mode (`build.lib`) with `\0perimeter-widget-entry` as the input, IIFE format, the configured `globalName`, React + ReactDOM bundled in (no `external`).
6. Emits source maps.

The runtime's `registerCss(name, cssText)` stores the CSS string in a per-name map; `mountWidget`/`nativeRender` look it up by widget name and inject it into the shadow root's `<style>` element alongside the resolved token variables. This keeps the CSS path identical between as-shipped (string baked into the bundle) and native (string still imported by the bundle, but lookup happens through the same map populated by `registerCss` — Studio calls `registerCss` for native widgets it has imported directly).

The plugin does **not** inspect the user's source to "find" `defineWidget`. It only requires that the entry module's default export is a `WidgetDefinition`. This avoids brittle AST parsing.

### `widgets/example`

A minimal widget used to validate the platform. Two `data-*` attrs: `data-greeting="Hello"`, `data-count="3"`. Renders that many `<Card>`s with the greeting. No API call. `auth: 'none'`. Lives in `widgets/example/`; deletable once a real widget has been ported (or kept as a smoke test).

### `apps/studio`

Next.js 16, App Router, Tailwind v4 with the `@perimeter/theme` preset. Three routes work at the end of Phase 1:

| Route | Behavior |
|---|---|
| `/components/<slug>` | Generated at build time from a static list. Each page renders the component with prop controls; controls update React state, not the URL. Five slugs: `button`, `card`, `input`, `label`, `skeleton`. |
| `/widgets/<slug>` | Generated from a static list of widget packages. For Phase 1: `example`. Side panel: data-attr config editor (writes to React state), theme override editor (writes to React state), render-mode toggle. The widget renders in a `<WidgetPreview>` component that calls either `nativeRender` or loads the local IIFE bundle. |
| `/theme` | Lists every token from `@perimeter/theme`. Each row is `<token name> <input value>`. Editing writes to a Studio-local override map (held in React context) that every `<WidgetPreview>` and `<ComponentPreview>` reads. No persistence in Phase 1. |

`/admin/*` is stubbed — a single placeholder page that says "Phase 3."

The Studio depends on `@perimeter/widget-runtime` and on each widget package directly (so `nativeRender` can use the imported `definition`). Studio is not deployed in Phase 1.

## Native vs. as-shipped rendering — the mechanism

A widget preview page in Studio uses one of two paths. Both produce a shadow root attached to a host element.

**Native (default).** The Studio page imports the widget package's default export — the `WidgetDefinition`. It calls `nativeRender({ definition, target, hostRoot, configOverrides, authFactory })`. The runtime:

1. Attaches a shadow root to `target`.
2. Resolves theme tokens (global ← widget overrides ← Studio editor overrides ← data-attr overrides) and injects them as `:host { --foo: …; }` style.
3. Mounts the same provider stack (`ErrorBoundary` → `ThemeProvider` → `AuthProvider` → `AuthGate` → `QueryClientProvider` → `App`) using `ReactDOM.createRoot(shadowRoot)`. The React root lives inside the shadow root; HMR and React DevTools work because the React instance is the page's React instance.

**As shipped.** The Studio page loads the locally-built IIFE bundle from `/widget-bundles/<name>.js`. Next.js rewrites that path to the monorepo's `dist/<name>/index.js` via `next.config.js` `rewrites` (no symlinks; no public/ copy step). The IIFE's `autoMount` finds the `<div data-perimeter-widget="<name>">` placed by the preview component and mounts itself. After load, Studio drives further changes (theme edits, config edits) by calling `window.PerimeterWidgets.applyOverrides(name, overrides)` and re-rendering the preview wrapper. Switching modes calls `mountedWidget.unmount()` first.

Both paths share the same provider stack and the same shadow-root code, so divergence is structurally hard. The only divergence is HMR (native only) and React identity (separate React instance in as-shipped). The umbrella's "preview-as-prod" intent is satisfied: the as-shipped mode renders the exact artifact that will eventually ship.

## Tooling baseline

- **Node 22+, pnpm 10.x, Turborepo 2.x** — `package.json#engines` enforces.
- **TypeScript** — single `tsconfig.base.json`, strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- **ESLint** — flat config, `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`. Existing repo's no-`any`-in-prod rule carries over.
- **Prettier** — root config.
- **Vitest** — every package has its own `vitest.config.ts`; Turborepo wires them. Test files exempt from no-`any`.
- **Turborepo pipelines** — `dev`, `build`, `test`, `lint`, `typecheck`. Each declares the right `dependsOn` (e.g. `widgets/*#build` depends on `^build`). No cache outputs from `dev`.

## CI

GitHub Actions workflow runs on PR and on push to `dev`:

1. `pnpm install --frozen-lockfile`
2. `pnpm quality`
3. (Phase 1) `pnpm build` — verifies every package builds, including `widgets/example` to IIFE.
4. No deploy step yet.

## Acceptance criteria for Phase 1

1. `pnpm install && pnpm quality` from a clean clone of the new repo exits 0.
2. `pnpm build` produces `dist/example/index.js` (an IIFE) under the per-widget gzipped size budget (umbrella: 220 KB).
3. `pnpm --filter @perimeter/studio dev` starts Studio at `localhost:3000`.
4. `localhost:3000/components/button` renders the button with all variants.
5. `localhost:3000/widgets/example` renders the example widget. Toggling **As shipped** loads the IIFE and the widget re-renders from the bundle. Toggling **Native** brings HMR back.
6. `localhost:3000/theme` lists tokens. Editing `color-primary` updates the button on `/components/button` and the example widget live in both render modes (as-shipped picks up the Studio override map via a postMessage shim — see "Theme propagation to as-shipped" below).
7. Running `pnpm --filter @perimeter/widget-example dev` in isolation rebuilds the IIFE on every source save; Studio's as-shipped mode picks it up via cache-bust on re-mount.
8. Appending a `<div data-perimeter-widget="example">` to the page after initial mount (verified by a Studio test page that uses `setTimeout` to insert one) causes the runtime to mount it within ~50 ms. Removing such a div triggers `unmount()`.
9. A Vitest test asserts that native and as-shipped modes produce equivalent DOM strings (shadow-root serialization) for the same `(config, overrides)` input, modulo a small allow-list of differences (React-internal attribute names if any). The test runs against the example widget in jsdom and is part of CI.

### Theme propagation to as-shipped

In as-shipped mode the IIFE has its own React tree, so the Studio's React context can't reach it. The `<WidgetPreview>` component, when in as-shipped mode, writes the current theme-override map onto `data-theme-*` attributes of the target div before the script loads, and on subsequent edits calls `window.PerimeterWidgets.applyOverrides(name, overrides)` (declared in the runtime interface). The runtime iterates the per-name live-instance registry and re-runs `resolveTokens` with the new `runtimeOverrides`, then rewrites the `:host` style of each shadow root.

## Risks specific to Phase 1

| Risk | Mitigation |
|---|---|
| Vite library-mode IIFE + Tailwind CSS pipeline mis-bundles styles (loses purge info, or splits CSS across files) | Pin `cssCodeSplit: false`, verify in CI that exactly one CSS asset is emitted per build and that it ends up inlined in the JS via the `?inline` import inside `<ThemeProvider>`. Snapshot test on the example widget. |
| Native and as-shipped render modes drift in behavior over time | Both paths share `mountWidget`'s internals (theme resolve, provider stack, shadow-root attach). A Phase 1 test asserts the two produce the same DOM string for a given config — running in jsdom against the example widget. |
| TypeScript path resolution across packages becomes fragile (a problem in the existing repo) | No path aliases inside published packages — only inside `apps/studio`. Cross-package types resolve through `package.json#exports`. |
| Bundle size already over budget before any real widget ships | Phase 1 sets up a CI check that fails the build if the example widget exceeds **220 KB gzipped** (matches the umbrella, revised after first-widget measurement). React 19 + ReactDOM alone are ~125 KB gz; with TanStack Query + zod + the runtime, a fresh example widget lands ~207 KB — small headroom by design. |

## Out of scope (Phase 1)

- Hosting bundles publicly.
- Loader script and `manifest.json`.
- Admin UI, release flow, promote/rollback.
- Cross-embed shared state.
- Form helpers (rhf + zod wrappers).
- Optimistic mutation / mutation queue helpers.
- API client per-endpoint functions.
- Sermons port.
- Documentation site beyond placeholder pages.

## Open questions (Phase 1)

None blocking. Two minor decisions to confirm during implementation:

1. **Component-level prop controls in Studio** — auto-generated from TypeScript prop types (via a build-time codegen) or hand-written per component page? Default for Phase 1: hand-written, because the component set is small. Revisit if the surface grows.
2. **React version** — React 19 (current at time of writing). No reason to pin lower.
