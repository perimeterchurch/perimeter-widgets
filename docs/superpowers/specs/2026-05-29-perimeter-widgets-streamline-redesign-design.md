# Perimeter Widgets — Streamline Redesign

**Status:** Proposed
**Date:** 2026-05-29
**Author:** parkerb@perimeter.org (with Claude)
**Supersedes:** the implementation that grew out of `2026-05-22-perimeter-widgets-rebuild-design.md` (umbrella) and its phase specs. The umbrella's *goals* still hold; this document changes the *shape* of the solution to be dramatically simpler.

## Context

The current `perimeter-widgets` is a Turborepo monorepo of **9 packages + 2 Next.js apps** (~20k LOC) serving **2 widgets**. The package decomposition itself is sound — each package is small and well-bounded — but the project has become hard to develop in and reason about. The pain concentrates in three places, not in the package split:

1. **The studio's dual render modes.** It maintains two separate widget renderers — a "native" React path (HMR) and an "as-shipped" IIFE path — with no automatic parity check. This is the single biggest threat to the goal that *dev rendering matches production*. Research across the embeddable-widget ecosystem (MakerKit, CompanyCam, Vite's own library-mode guidance) is unanimous that this split is an anti-pattern: parity is achieved by having **one mount function** used by both dev and production, not by maintaining two renderers.
2. **Build indirection.** `@perimeter/vite-plugin-widget` generates a virtual entry at build time and string-substitutes CSS into the JS bundle. It works, but it is hard to debug and non-obvious where the real entry point is.
3. **Hosting/release machinery.** A dedicated Next.js `cdn` app + Vercel Blob (bundles) + Upstash Redis KV (version pointers) + a bespoke `publish-widget` script + an auth-gated admin promote/rollback UI (`@perimeter/release-store`). For a small team shipping a handful of widgets, this is far more infrastructure than the problem requires.

The goal of this redesign is a **streamlined development experience** — live hot reloading, dev/production render parity, and a workflow simple enough that the team (and Claude) can build new widgets and UI components by prompting. We keep the parts that worked (per-widget Vite IIFE builds, shadow-DOM mounting, the `defineWidget` contract, the design-token theming model, the `AuthProvider` seam, the package decomposition, Turborepo) and replace the parts that did not (dual render, build codegen, the hosting/release stack).

This is a **scaffold rebuild**: a fresh, deliberately minimal structure into which we carry the sermons widget and the UI components as content. The existing code archives to a `legacy/` branch.

## Goals

1. **One render path.** A single `mount()` function is used identically in dev (with full Vite HMR) and production (IIFE). Dev renders byte-for-byte like production because it is the same code.
2. **Live hot reloading** in a fast Vite-based studio. Sub-second HMR; no Next.js build standing between the developer and the widget.
3. **`data-*` embed contract preserved** exactly: widgets are configured from `data-*` attributes on the host element, validated by the widget's zod schema, in production and dev alike.
4. **Simple hosting + versioning**: immutable versioned bundles + a `manifest.json` pointer + a release CLI. Promote/rollback via git and Vercel Instant Rollback. No database, no Blob, no admin UI.
5. **Public and authenticated widgets both first-class**, behind the existing `AuthProvider` seam; default reads the MP token from `localStorage` (unchanged WordPress contract).
6. **Querying perimeter-api** for reads (and later writes) via a typed client + React Query hooks.
7. **AI-friendly**: plain React + Vite, explicit entry points, auto-discovery — minimal magic for a developer or Claude to reverse-engineer.
8. **Keep the sermons widget intact** as the first example widget on the new platform.
9. **Scale path to ~25 widgets** without re-architecting; self-contained bundles now, shared-React later if/when bundle count makes it hurt.

## Non-goals

- A content-author CMS or per-customer runtime theming. Theming is a developer-time activity plus per-instance `data-theme-*` overrides.
- An in-widget client-side router. Mini-app flows use React state.
- Publishing `@perimeter/ui` to npm now (the component-file discipline keeps a future export cheap).
- Externalizing/sharing React across bundles now (explicitly deferred — see Decisions #9).
- A clickable promote/rollback admin UI (replaced by git + CLI + Vercel Instant Rollback).
- Rebuilding `helpdesk`, `metrics`, or `perimeter-api`.

## Summary of decisions

| # | Decision |
|---|----------|
| 1 | **Scaffold rebuild.** Fresh minimal structure; carry sermons + UI components as content; archive current code to a `legacy/` branch. |
| 2 | **Keep the package decomposition and Turborepo** — the packages are well-bounded; the pain was elsewhere. |
| 3 | **Delete `@perimeter/release-store`** and the entire Blob + KV + admin-UI release stack. |
| 4 | **Replace the two Next.js apps** with one **Vite studio app** (dev harness + deployed gallery) and one **plain static `cdn/` directory** (bundles + manifest + loader). |
| 5 | **One mount path.** `mount(host, definition, css, overrides?)` is the single source of truth; production IIFE and the dev harness both call it. The dual native/as-shipped render is removed. |
| 6 | **Simplify `@perimeter/vite-plugin-widget`**: drop virtual-entry codegen + CSS string-substitution in favor of an explicit per-widget `entry.ts` plus a `widgetConfig({ name })` Vite helper. CSS is imported as a string via `?inline` — the single CSS source for dev and prod. |
| 7 | **Auto-discovery** of widgets and UI components in the studio via `import.meta.glob` — no hand-edited registries. |
| 8 | **Hosting:** immutable versioned files (`cdn/<name>/<version>/index.js`, cached 1 year immutable) + `cdn/manifest.json` (short TTL). Served as a plain static Vercel deploy with CORS. |
| 9 | **Self-contained bundles now**; lazy-load per-widget heavies (react-pdf, hls.js) via dynamic `import()`. Shared-React via import map is deferred. |
| 10 | **Release via git + CLI:** `pnpm release <widget>` copies the built bundle to the immutable path, updates the manifest, and opens a PR. Promote = the manifest change; rollback = git revert or Vercel Instant Rollback. |
| 11 | **Auth seam unchanged:** `AuthProvider` interface, default `MPLocalStorageAuth` reads `mpp-widgets_AuthToken` / `mpp-widgets_ExpiresAfter`. |
| 12 | **Commit built bundles to git** so promote/rollback is a pure git operation; prune old versions periodically. |
| 13 | **Tailwind-in-shadow correctness baked into the runtime/build**: px-based token scale, `:root`→`:host` rewrite, `@property` hoisted to the document, one shared `CSSStyleSheet` via `adoptedStyleSheets`. |
| 14 | **Port sermons** as the proof of the new platform; keep its components/UX, rewire its data layer and mount path. |

## Architecture

### Repo structure

```
perimeter-widgets/
├── turbo.json                # narrow pipeline: build, dev, test, lint, typecheck
├── pnpm-workspace.yaml
├── packages/
│   ├── runtime/              # @perimeter/widget-runtime — defineWidget, mount, autoMount, providers, useAuth, useApiClient
│   ├── theme/                # @perimeter/theme — tokens (px scale) + Tailwind preset + token→CSS resolver
│   ├── auth/                 # @perimeter/auth — AuthProvider interface + MPLocalStorageAuth
│   ├── api-client/           # @perimeter/api-client — typed fetch wrapper over perimeter-api
│   ├── api-hooks/            # @perimeter/api-hooks — React Query hooks + generated OpenAPI types
│   ├── ui/                   # @perimeter/ui — shadcn-style components (subpath exports)
│   └── vite-plugin-widget/   # @perimeter/vite-plugin-widget — widgetConfig() build helper
├── widgets/
│   ├── sermons/              # @perimeter/widget-sermons — ported, intact
│   └── example/              # minimal template ("copy me to start a new widget")
├── studio/                   # Vite app — dev harness (HMR) AND the deployed gallery (one app, two modes)
├── cdn/                      # plain static dir — versioned bundles + manifest.json + loader.js + vercel.json
└── docs/
```

What changes vs. today: the **package set is the same minus `release-store`**; the **two Next.js apps become a Vite app + a static dir**; `vite-plugin-widget` is simplified. `api-types` (generated OpenAPI types) folds into `api-hooks` as a generated source file rather than a standalone package, to reduce package count by one without losing the types.

### The widget contract (unchanged in spirit)

Every widget exports a single `defineWidget` call:

```ts
// widgets/sermons/src/widget.tsx
import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './App';

export default defineWidget({
  name: 'sermons',
  auth: 'none',                              // 'none' | 'optional' | 'required'
  schema: z.object({
    seriesId:    z.string().optional(),
    initialView: z.enum(['grid', 'list']).default('grid'),
    limit:       z.coerce.number().int().min(1).max(50).default(12),
  }),
  themeOverrides: { /* optional widget-level token overrides */ },
  App,                                        // ({ config, auth }) => JSX; config is typed from schema
});
```

`version` is injected from the widget's `package.json` at build time. The schema validates `data-*` attributes at mount time and produces the typed `config`. The same schema drives the studio's per-widget config panel.

### The single mount path

One function is the source of truth for how a widget renders. It is used identically in dev and prod.

```ts
// @perimeter/widget-runtime/mount.ts (illustrative)
export function mount(host: HTMLElement, definition: WidgetDefinition, css: string, overrides?: Partial<Config>) {
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.adoptedStyleSheets = [getSheet(definition.name, css)];   // one parse, shared across instances
  const config = definition.schema.parse({ ...readDataAttrs(host), ...overrides });
  applyThemeVars(shadow.host, definition.themeOverrides, readThemeAttrs(host));
  const container = shadow.appendChild(document.createElement('div'));
  createRoot(container).render(
    <Providers definition={definition} config={config}>
      <definition.App config={config} auth={/* from AuthProvider */} />
    </Providers>,
  );
}
```

Provider stack (order matters): `ErrorBoundary → ThemeProvider → AuthProvider → AuthGate → ApiClientProvider → QueryClientProvider → App`. The `ErrorBoundary` catches uncaught render errors and shows a minimal fallback that does not leak through the shadow root. `AuthGate` is a separate concern that renders a "please sign in" state for `auth: 'required'` widgets with no token.

**Production entry** — explicit, tiny, no codegen:

```ts
// widgets/sermons/src/entry.ts — what Vite builds into the IIFE
import widget from './widget';
import css from './styles.css?inline';   // single CSS source for dev AND prod
import { autoMount } from '@perimeter/widget-runtime';
autoMount(widget, css);                   // scans [data-perimeter-widget="sermons"], mounts each, watches DOM
```

`autoMount` scans for `[data-perimeter-widget="<name>"]`, calls `mount()` for each, dedupes (idempotent if the bundle loads twice), and watches via `MutationObserver` for late-inserted targets.

**Dev harness** imports the same `widget` default and the same `?inline` css and calls the same `mount()` into a preview host element, with a `useEffect` that mounts on a ref and unmounts on cleanup. Vite HMR works natively because the harness imports the real source. There is no second renderer.

### The `data-*` embed contract (production, unchanged)

```html
<div
  data-perimeter-widget="sermons"
  data-limit="6"
  data-initial-view="list"
  data-series-id="abc123"
  data-theme-color-primary="hsl(15 80% 50%)"
></div>
<script src="https://widgets.perimeter.org/sermons/latest.js" async></script>
```

On load the IIFE: (1) finds every `[data-perimeter-widget="sermons"]`; (2) reads all `data-*` attributes, maps kebab-case → camelCase (`data-initial-view` → `initialView`), and validates against the widget's zod schema to produce the typed `config`; (3) pulls `data-theme-*` attributes out separately and writes them as CSS variables on that instance's `:host`; (4) installs a `MutationObserver` so SPA/AJAX-inserted divs still mount.

Notes:
- All `data-*` values are strings; the schema coerces (`z.coerce.number()`, enums). Booleans are special-cased: the runtime parses `"true"`/`"false"` explicitly rather than relying on `z.coerce.boolean()` (which treats any non-empty string as `true`).
- Unknown `data-theme-*` token names are dropped with a console warning; token values are written only into typed CSS-variable declarations on `:host`, never injected as raw CSS.
- **Dev parity:** the studio config panel writes the same `data-*` attributes onto the preview host (or passes equivalent `overrides`) and runs the same parse path. There is no separate dev config format.

### Theming and Tailwind-in-shadow

Source of truth: `packages/theme/src/tokens.ts` — a typed object mapping token names to values, using a **px-based scale** (immune to a host page setting `html { font-size }`, which would otherwise rescale `rem`-based Tailwind sizes inside the shadow root). Three artifacts compile from it: a Tailwind preset (so `bg-primary` === `var(--color-primary)`), a runtime CSS-variable resolver, and a token schema the studio's theme editor validates against.

Resolution order at mount (last write wins): `globalTokens ← widget.themeOverrides ← data-theme-* attrs ← studio runtime overrides (dev only)`.

The runtime/build handle the known shadow-DOM gotchas once, so widget authors never think about them:
- Rewrite `:root` → `:host` in the compiled CSS before injection.
- Hoist Tailwind v4 `@property` rules to the document (they do not register inside a shadow root).
- Inject CSS via a single shared `CSSStyleSheet` (`adoptedStyleSheets`) — one parse shared across all instances of a widget — with an inline `<style>` fallback for older Safari.
- Use `import './styles.css?inline'` as the one CSS path in both dev and prod, so Vite's dev server does not inject styles into `document.head` (the documented dev/prod divergence).

### Component library — `@perimeter/ui`

A plain internal package; each component is a self-contained file using a peer primitive + Tailwind classes that read theme tokens. No registry build during day-to-day work. The discipline (only internal imports are `@perimeter/theme` tokens and one peer primitive) keeps a future registry export a copy-paste rather than a refactor.

### Auth — `@perimeter/auth`

```ts
export interface AuthProvider {
  getToken(): string | null;
  isAuthenticated(): boolean;
  onChange(cb: (token: string | null) => void): () => void;
  dispose?(): void;
}
```

Default `MPLocalStorageAuth` reads `mpp-widgets_AuthToken` and `mpp-widgets_ExpiresAfter` from `localStorage` — identical to today's WordPress contract — checks expiry, and syncs across tabs via `storage` events + a poll fallback. The API client pulls the bearer token from the active provider and sets `Authorization: Bearer <token>`. UI gates on `isAuthenticated()` for UX only; **perimeter-api enforces auth on every protected endpoint**.

A future `PostMessageAuth` (host hands the widget a short-lived, server-signed token over `postMessage`, held in memory, with an exact-origin allowlist + nonce handshake — the Intercom/Stripe model) plugs in behind the same interface with no widget code changes. Deferred; documented as the security upgrade path.

### API — `@perimeter/api-client` + `@perimeter/api-hooks`

`api-client` is a typed `fetch` wrapper over perimeter-api that injects the bearer token. `api-hooks` exposes React Query hooks per endpoint, typed from generated OpenAPI types (the former `api-types` package's generated file lives here). Sermons consumes `useSermons`, `useSermonDetail`, `useSeries`, `useSeriesDetail`, `useSpeakers`, `useBooks`, `useServiceTypes`.

### Build pipeline — `@perimeter/vite-plugin-widget`

Each widget's `vite.config.ts` is a few lines:

```ts
import { defineConfig } from 'vite';
import { widgetConfig } from '@perimeter/vite-plugin-widget';

export default defineConfig(widgetConfig({ name: 'sermons' }));
```

`widgetConfig()` returns a Vite config that: builds `src/entry.ts` in library mode (IIFE, single file, React bundled in), injects the `package.json` version, applies the `:root`→`:host` / `@property`-hoist CSS transforms, and sets the IIFE global name. There is **no virtual-entry generation and no CSS string-substitution** — the entry is the real, committed `src/entry.ts`, and CSS arrives as a `?inline` string the runtime injects.

Per-widget commands (via Turborepo):

| Command | What |
|---------|------|
| `pnpm --filter @perimeter/widget-sermons dev`   | Vite watch rebuild |
| `pnpm --filter @perimeter/widget-sermons build` | Single IIFE → `widgets/sermons/dist/index.js` |
| `pnpm --filter @perimeter/widget-sermons test`  | Vitest for this widget only |
| `pnpm dev`     | Studio harness (imports all widgets, HMR) |
| `pnpm build`   | Everything, cached by Turborepo |
| `pnpm release <name>` | Build + copy to immutable cdn path + update manifest + open PR |
| `pnpm quality` | typecheck + lint + format check + test |

### Studio — one Vite app, two modes

- **`pnpm dev`** → local dev harness: a left-nav of all widgets + all UI components (auto-discovered via `import.meta.glob`), each previewed through the real `mount()` in a shadow root; live token/theme editing (flip CSS vars on `:host`); per-widget `data-*` config panel; copy-paste embed snippet. Fast HMR. This is what the team and Claude develop in.
- **`pnpm build` + deploy** → the same app built static = the read-only **gallery** at `style.perimeter.org`, for browsing components/widgets without running locally.

No `/admin` routes, no release UI, no dual render toggle.

### Hosting + release

**`cdn/`** is a plain static directory deployed as its own Vercel project at `widgets.perimeter.org` (no Next.js). It serves:

```
cdn/sermons/1.1.0/index.js        ← immutable; Cache-Control: public, max-age=31536000, immutable
cdn/sermons/1.1.0/index.js.map
cdn/manifest.json                 ← mutable pointer { "sermons": "1.1.0" }; short s-maxage + SWR
cdn/loader.js                     ← optional global loader (later phase)
cdn/vercel.json                   ← headers, CORS, latest rewrite
```

`vercel.json` sets: immutable cache on versioned paths; `public, max-age=0, s-maxage=60, stale-while-revalidate=86400` on `manifest.json` and `/<name>/latest.js`; `Access-Control-Allow-Origin: *` on bundles (they load cross-origin from WordPress); and a rewrite so `/<name>/latest.js` → the version named in the manifest.

**`pnpm release <name>`**:
1. Read the version from the widget's `package.json` (e.g. `1.1.0`).
2. Build the widget; copy the bundle + sourcemap to `cdn/<name>/<version>/index.js` (immutable; never overwritten).
3. Update `cdn/manifest.json` to point `<name>` → `<version>`.
4. Commit to a feature branch and open a PR (honoring the never-commit-to-dev/main rule).

**Promote** = the manifest change in that PR; merging deploys it. **Rollback** = revert the manifest commit, or use Vercel Instant Rollback (instant, no rebuild). Git history is the audit log. Built bundles are committed (decision #12) so this is a pure git flow; old versions are pruned periodically.

The **direct per-widget script tag works from day one**; the global `loader.js` (reads the manifest, scans the page, lazy-loads only widgets present, dedupes) is an optional later addition following the Segment/GA async-stub-and-queue pattern.

## Migration & phasing

Scaffold rebuild. The existing code archives to a `legacy/` branch. Each phase ends at a runnable, verifiable state.

1. **Foundation** — Scaffold packages (`runtime`, `theme`, `auth`, `api-client`, `api-hooks`, `ui`, `vite-plugin-widget`) on the single mount path; Vite studio harness with component previews and theme editor; the `example` widget. `pnpm quality` passes. No production change.
2. **Sermons port** — Port sermons end-to-end via `defineWidget`; keep components/UX, rewire data layer + mount path; lazy-load react-pdf/hls.js. Studio `/widgets/sermons` works (one render path). Local static `cdn/` serves the built bundle. WordPress still points at the legacy URL.
3. **Hosting + release** — Deploy `cdn/` (static) and the gallery; `pnpm release` + manifest + cache/CORS headers + `latest` rewrite live.
4. **Cutover** — Point the WordPress `<script>` for sermons at `widgets.perimeter.org`; monitor; retire the old jsDelivr bundle after a stable window (e.g. one week).

Adding a widget after the platform exists is single-task work (copy `example`, build, `pnpm release`), not a project.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| The convention-driven runtime becomes a straitjacket for an unusual widget | `mount()` is the low-level escape hatch; a widget can call it directly without leaving the runtime. |
| `data-theme-*` overrides allow arbitrary CSS values into the shadow root | Unknown tokens rejected with a warning; values written only into typed CSS-variable declarations on `:host`, never as raw CSS. |
| Committing built bundles grows the repo | Prune old versions periodically; move to git-lfs or build-in-CI only if growth becomes a problem (decision is reversible). |
| Self-contained bundles each ship their own React (~25 widgets) | Accepted now; lazy-load per-widget heavies. Shared-React via import map is the documented next step if bundle count makes it hurt — the loader path already exists to host a shared runtime. |
| Dev/prod CSS divergence (Vite dev injecting into `document.head`) | Single `?inline` CSS path injected into the shadow root in both modes; the studio exercises the real `mount()`. |
| `rem`-based sizes rescale when a host sets `html { font-size }` | px-based token scale; no `rem` enters the bundle. |
| localStorage token is XSS-prone | Isolated to `MPLocalStorageAuth`; the rest speaks only to `AuthProvider`; `PostMessageAuth` is a single-swap upgrade. |
| Vercel Instant Rollback reverts env vars/crons with the deployment, and on Hobby only rolls back one step | Keep the static `cdn/` project free of env-var/cron state; rely primarily on manifest-revert for rollback, with Instant Rollback as a backstop. |

## Open questions

1. **Shared-React threshold** — at what widget count / total payload do we introduce the import-map shared runtime? Revisit when the 3rd–4th heavy widget lands; not blocking.
2. **`loader.js` timing** — ship the global loader in Phase 3 or defer until a second widget is in production? Default: stub it in Phase 3, harden when a second widget cuts over.
3. **`cdn/` vs gallery hosting** — one Vercel project or two? Default: two plain static deploys (gallery at `style.perimeter.org`, bundles at `widgets.perimeter.org`) for clean separation; revisit if it adds friction.

## Out of scope

- Customer-facing / content-author theme customization.
- Server-side rendering of widget HTML.
- Native mobile embedding.
- Migrating `helpdesk`, `metrics`, or `perimeter-api` to consume `@perimeter/ui`.
- Externalizing/sharing React across bundles (deferred; see Open Questions #1).
