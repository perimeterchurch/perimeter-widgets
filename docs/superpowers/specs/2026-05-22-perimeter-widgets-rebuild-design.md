# Perimeter Widgets — Rebuild Design (Umbrella)

**Status:** Proposed
**Date:** 2026-05-22
**Author:** parkerb@perimeter.org (with Claude)

> This document is the platform-level (umbrella) design. It is deliberately scoped wider than a single implementation plan can absorb. Each phase below gets its own focused spec — the first of which is `2026-05-22-perimeter-widgets-phase-1-foundation-design.md` and is the one that feeds writing-plans. Sections of this document that are pre-phase-1 design (the widget contract, package responsibilities, theming model, auth interface) are authoritative. Sections that describe later phases (hosting/release, admin UI, cutover) are sketches and will be re-specified per phase.

## Context

The current `perimeter-widgets` is a Turborepo monorepo that already embodies many of the right ideas: per-widget Vite IIFE builds, shadow DOM mounting, a shadcn-derived component registry, a Next.js showcase site, and direct WordPress embedding. Only one widget (`sermons`) is in production today.

In practice the project has been hard to develop in and manage. Architecture is too layered; the dev/build experience is fragile (Turborepo orchestration + symlinks + jsDelivr cache purges); the theming story is inadequate for the variety of widgets we expect; and hosting via committed `dist/` + jsDelivr is the wrong long-term shape. The goal here is a full reset that keeps the parts that worked, fixes the parts that did not, and is built to scale to 25+ widgets — some of them effectively small apps.

## Goals

1. Each widget is an isolated React app that builds and develops independently.
2. Widgets render inside a shadow DOM with full style isolation.
3. Widgets embed via plain HTML — script tag or declarative `<div>` — on WordPress and any other site.
4. Tailwind everywhere; design tokens are the source of truth for theming.
5. Per-widget builds are fast in isolation; the full monorepo build is cached.
6. A shared component library that developers can edit and theme with live feedback in a Storybook-like dev tool.
7. Widgets fetch from `api.perimeter.org` (perimeter-api) for both reads and writes.
8. Authenticated and public widgets are both first-class; auth is abstracted so the underlying mechanism can change later.
9. Repo stays private.
10. Built bundles are hosted on Vercel at versioned URLs with an admin UI for promotion and rollback.

## Non-goals

- A content-author CMS or per-customer customization. Theming is a developer-time activity.
- Multi-tenant or campus-specific theming as a runtime feature beyond per-instance `data-*` overrides.
- An in-widget client-side router. Mini-app flows use React state, not URL routing.
- Publishing `@perimeter/ui` to npm or to a registry now (designed so this can happen later).
- Rebuilding the existing `helpdesk`, `metrics`, or `perimeter-api` projects.

## Summary of decisions

| # | Decision |
|---|---|
| 1 | Full greenfield rebuild; existing repo archived to a `legacy/v1` branch |
| 2 | Target scale: 25+ widgets, some effectively mini-apps |
| 3 | "Visual theme tool" = developer-only Storybook-like hot-reload dev app |
| 4 | Hosted on Vercel; admin UI for releases (versioned URLs, promote/rollback) |
| 5 | Hybrid embed: direct script tag OR a global loader script |
| 6 | Auth abstracted behind an `AuthProvider` interface; default implementation reads MP token from `localStorage` (current contract); swappable later |
| 7 | Theming: global tokens + per-widget overrides + per-instance overrides via `data-*` |
| 8 | Plain internal component package; each component self-contained so a future registry export is a copy-paste |
| 9 | Per-widget independent semver; `/latest.js` mutable pointer per widget; admin UI promotes/rolls back |
| 10 | Dev renders widgets via native React (full HMR); production is IIFE; per-page "preview-as-prod" toggle |
| 11 | Built-in: react-hook-form + zod, TanStack Query (with mutation/optimistic helpers), cross-embed shared state. **No** in-widget router |
| 12 | Admin/release UI lives inside the single dev Studio app; auth-gated routes |
| 13 | Port `sermons` as the proof of the new platform |
| 14 | Stay on Turborepo with cleaner, narrower pipelines |
| 15 | Bundles served from a Next.js app on Vercel (`widgets.perimeter.org`) backed by Vercel Blob storage |

## Architecture

### Repo structure

```
perimeter-widgets/
├── apps/
│   ├── studio/                     # Next.js: dev showcase + theme editor + admin UI (auth-gated)
│   └── cdn/                        # Next.js: serves built widget bundles at widgets.perimeter.org
├── packages/
│   ├── runtime/                    # @perimeter/widget-runtime — defineWidget, mount, providers, loader
│   ├── ui/                         # @perimeter/ui — plain component library on Tailwind
│   ├── theme/                      # @perimeter/theme — tokens, resolver, Tailwind preset
│   ├── auth/                       # @perimeter/auth — AuthProvider interface + MPLocalStorageAuth impl
│   ├── api-client/                 # @perimeter/api-client — typed perimeter-api client
│   ├── form/                       # @perimeter/form — react-hook-form + zod + shared Field helpers
│   ├── shared-state/               # @perimeter/shared-state — cross-embed pub/sub store
│   └── vite-plugin-widget/         # @perimeter/vite-plugin-widget — generates IIFE entry from defineWidget
└── widgets/
    └── sermons/                    # @perimeter/widget-sermons — first widget on the new platform
```

Each package has one responsibility and a typed public interface. Widgets only depend on the packages they actually use.

### The widget contract

Every widget exports a single `defineWidget` call.

```ts
// widgets/sermons/src/index.ts
import { defineWidget } from '@perimeter/widget-runtime';
import { z } from 'zod';
import { App } from './App';

export default defineWidget({
  name: 'sermons',
  auth: 'optional',                          // 'required' | 'optional' | 'none'
  schema: z.object({
    seriesId:    z.string().optional(),
    initialView: z.enum(['grid', 'list']).default('grid'),
    limit:       z.coerce.number().int().min(1).max(50).default(12),
  }),
  themeOverrides: { 'color-accent': 'hsl(15 80% 50%)' },   // optional widget-level tokens
  App,                                       // ({ config, auth }) => JSX. config is typed from schema.
});
```

`version` is injected from the widget's `package.json` at build time. The schema validates `data-*` attributes at mount time and produces the typed `config` passed to `App`. The same schema feeds the Studio's per-widget configuration UI.

### Runtime & providers

`@perimeter/vite-plugin-widget` reads the `defineWidget` default export at build time and generates an IIFE entry that:

1. On load, scans the page for `<div data-perimeter-widget="<name>">` targets and supports an explicit `window.PerimeterWidgets.mount(target, configOverrides?)` for manual mounting.
2. For each target:
   - Reads `data-*` attributes and validates them with the widget's zod schema.
   - Attaches a shadow root.
   - Resolves theme tokens (see Theming) and injects them as CSS variables on `:host`.
   - Mounts providers in this order:
     `ErrorBoundary` → `ThemeProvider` → `AuthProvider` → `QueryClientProvider` → `SharedStateProvider` → `App`.
3. Watches for dynamically added targets via `MutationObserver` (so SPAs that insert widgets after initial render work).
4. Deduplicates: if the same bundle loads twice (direct + loader), the second invocation is a no-op.

A lower-level `mountWidget(...)` is the escape hatch for any widget that needs to step outside the convention.

### Theming

Source of truth: `packages/theme/src/tokens.ts` — a typed object mapping token names to values.

```ts
export const globalTokens = {
  'color-bg':      'hsl(0 0% 100%)',
  'color-fg':      'hsl(222 47% 11%)',
  'color-primary': 'hsl(221 83% 53%)',
  'color-accent':  'hsl(262 83% 58%)',
  'radius-md':     '0.5rem',
  'font-sans':     'Inter, system-ui, sans-serif',
  // ...
} as const;
export type ThemeToken = keyof typeof globalTokens;
```

Three artifacts compile from this file:

1. A **Tailwind preset** (`@perimeter/theme/tailwind`) so `bg-primary` resolves to the same value as `var(--color-primary)`.
2. A **runtime CSS-variable string** injected into each widget's shadow root.
3. A **token schema** the Studio's theme editor uses to validate edits.

Resolution order at mount (last write wins):

```
globalTokens  ←  widget.themeOverrides  ←  data-theme-* attrs on the embed div
```

`data-*` override grammar: any attribute whose name begins with `data-theme-` maps to a token by stripping the prefix. `data-theme-color-primary="hsl(15 80% 50%)"` overrides the `color-primary` token. The attribute value is the verbatim CSS value the runtime writes into `--color-primary` on `:host`. Unknown token names (no entry in `globalTokens`) are dropped with a console warning — they never reach CSS. Token values themselves are not validated for CSS shape; the assumption is that broken CSS only damages the one widget instance it appears on, and a known-token typo is by far the more common error.

The resolved map becomes `--color-primary: …;` declarations on the shadow root host.

### Component library — `@perimeter/ui`

A plain internal package. Each component is a self-contained file using Radix primitives + Tailwind classes that read from theme tokens. No registry build, no `add` workflow during day-to-day work. The discipline: every component file's only monorepo-internal imports are `@perimeter/theme/tokens` and (where relevant) one peer primitive. That makes a future registry export a copy-paste rather than a refactor.

### Auth

```ts
// packages/auth/src/types.ts
export interface AuthProvider {
  getToken():        string | null;
  isAuthenticated(): boolean;
  onChange(cb: (token: string | null) => void): () => void;
}
```

Default implementation `MPLocalStorageAuth` reads `mpp-widgets_AuthToken` and `mpp-widgets_ExpiresAfter` from `localStorage` — identical to today's WordPress contract, just behind an interface. Future implementations (e.g. `CookieSessionAuth` against perimeter-api) plug in at runtime construction. Widgets only ever touch `useAuth()`.

For `auth: 'required'` widgets, the runtime renders a "please sign in" state when no token is present and re-renders when `onChange` fires. Note: auth gating is its own concern, not error handling — it lives in a small `<AuthGate>` component between `AuthProvider` and `QueryClientProvider`, separate from the outermost `ErrorBoundary`. The error boundary's job is catching uncaught widget render errors and rendering a minimal fallback that does not leak through the shadow root.

### API client — `@perimeter/api-client`

Typed wrapper around `fetch` to `api.perimeter.org`. Pulls the bearer token from the active `AuthProvider`. Exposed as per-endpoint functions consumed through TanStack Query. If perimeter-api exposes an OpenAPI spec, the client is generated; otherwise it's hand-written with types shared via a thin types package.

### Embed patterns (hybrid)

The same bundle is used in both modes.

**Direct embed** — one script per widget.

```html
<div id="sermons-1" data-perimeter-widget="sermons" data-limit="6"></div>
<script src="https://widgets.perimeter.org/sermons/latest.js" async></script>
```

The bundle self-mounts on load.

**Loader embed** — one global script for the whole site.

```html
<script src="https://widgets.perimeter.org/loader.js" async></script>
<!-- anywhere on any page: -->
<div data-perimeter-widget="sermons" data-limit="6"></div>
<div data-perimeter-widget="events"></div>
```

The loader reads `widgets.perimeter.org/manifest.json` (names → current bundle URLs), scans the page, lazy-loads only bundles actually used, dedupes, and watches the DOM for late insertions.

### Hosting on Vercel

`apps/cdn` is a Next.js app at `widgets.perimeter.org`. It serves two kinds of resources:

1. **Immutable versioned bundles** at `/<name>/<version>/index.js` with `Cache-Control: public, max-age=31536000, immutable`.
2. **Mutable pointers** — `/<name>/latest.js`, `/loader.js`, `/manifest.json` — with short edge TTLs.

| Pointer | Cache | Updated when |
|---|---|---|
| `/<name>/<version>/index.js` | 1 year, immutable | Never (set on first publish) |
| `/<name>/latest.js` | `s-maxage=300, stale-while-revalidate=86400` (≈60s perceived TTL) | Each promotion |

**Storage:** Vercel Blob for the bundles themselves. A small Vercel KV (or DB) holds the per-widget pointer (`latest:<name> → <version>`). The `apps/cdn` route handlers read the pointer, stream the matching Blob, and set the cache headers above.

Why Blob over a pure static deploy: promotion becomes a single KV write rather than a redeploy; storage scales independently of the app; rollback is a pointer flip on bytes already published. Static-deploy remains an acceptable fallback at implementation time (see Open Questions).

### Release flow

Every PR that changes a widget runs in CI:

1. Build the changed widgets via Turborepo (`turbo build --filter=...`).
2. Compute version. Main builds use the `package.json` version (`1.2.3`); non-main builds append the commit short-sha (`1.2.3-abc1234`).
3. Upload the bundle and sourcemap to Vercel Blob at the immutable path.
4. Mark the build as "available" in the release record.

Promotion is **manual**, from the Studio admin UI. Per widget, devs see every available build with version, commit, PR link, build time, size. Click **Promote to latest** → confirm → KV pointer flips. Click **Roll back** → pick any previous build → pointer flips back. Edge cache catches up within ~60s.

### Studio — the one dev app

`apps/studio` is a Next.js app at `localhost:3000` in development and `studio.perimeter.org` in production. The `/admin/*` routes are auth-gated; everything else is dev-internal but public-readable.

| Route | Purpose |
|---|---|
| `/components/<slug>` | One page per `@perimeter/ui` component. Live preview + prop controls + source link. |
| `/widgets/<slug>` | Live widget preview in a real shadow root. Side panel: data-attr config editor, theme override panel, copy-pasteable embed snippet, mode toggle. |
| `/theme` | Theme editor. Lists every token; edits apply to every preview live (writes to a local override file in dev; read-only view of committed tokens in prod). |
| `/docs/...` | MDX pages — embed guide, adding a widget, runtime contract, etc. |
| `/admin/releases` | Auth-gated. Per-widget build list, promote/rollback, activity log. |

Every widget preview page has a render-mode toggle:

- **Native (default):** Studio imports the widget's `defineWidget` export and renders it via React directly in a shadow root. Full HMR; DevTools work; fast iteration.
- **As shipped:** Studio loads the actually-built IIFE bundle (read from local `dist/` while Vite watch rebuilds). Byte-for-byte production. Slower iteration; used to verify the real artifact.

### Build pipeline

Each widget's `vite.config.ts` is a few lines:

```ts
import { defineConfig } from 'vite';
import { perimeterWidget } from '@perimeter/vite-plugin-widget';

export default defineConfig({ plugins: [perimeterWidget()] });
```

`@perimeter/vite-plugin-widget` detects the `defineWidget` default export from `src/index.ts`, generates the actual IIFE entry on the fly, configures library mode (IIFE format, inlined CSS via `?inline`, React/ReactDOM bundled in), and injects the `package.json` version.

Per-widget commands:

| Command | What |
|---|---|
| `pnpm --filter @perimeter/widget-sermons dev` | Vite watch rebuild + Studio HMR pickup |
| `pnpm --filter @perimeter/widget-sermons build` | Single IIFE in `dist/sermons/index.js` |
| `pnpm --filter @perimeter/widget-sermons test` | Vitest for this widget only |
| `pnpm dev` | All widgets watch + Studio |
| `pnpm build` | Everything, cached by Turborepo |
| `pnpm quality` | typecheck + lint + format + test |

### Supporting libraries

- **`@perimeter/form`** — `<Form>` + `<Field>` components over react-hook-form, bound to `@perimeter/ui` inputs, with a zod resolver default. Centralised error display so widget forms are uniform.
- **`@perimeter/shared-state`** — pub/sub store on `window.__perimeterWidgets.state`. Widgets call `useSharedState(key, schema)`; the store validates on read so widgets never receive a wrong shape from another widget. Keys are namespaced (`sermons:lastViewedId`).
- **TanStack Query helpers** in `@perimeter/widget-runtime/query` — `useOptimisticMutation`, `useMutationQueue`, retry/backoff defaults. The runtime owns the per-widget `QueryClient`.

## Migration & phasing

Greenfield rebuild. The existing repo is archived to a `legacy/v1` branch for reference. Each phase ends at a runnable, verifiable state.

1. **Foundation** — Monorepo scaffold; `theme`, `ui`, `auth`, `api-client`, `runtime`, `vite-plugin-widget`. Studio shell with `/components` and `/theme`. No widgets yet. `pnpm quality` passes.
2. **First widget on the new platform** — Port `sermons` end-to-end via `defineWidget`. Studio `/widgets/sermons` works in both render modes. Local `vercel build` of `apps/cdn` serves the bundle. WordPress still points at the legacy URL — no production change yet.
3. **Hosting + release flow** — `apps/cdn` deployed to `widgets.perimeter.org`. Vercel Blob storage and KV pointers wired. CI publishes builds. Studio admin UI promotes/rolls back. `loader.js` and `manifest.json` live.
4. **Cutover** — Swap the WordPress `<script>` URL for `sermons` to the new CDN. Monitor. Retire the old jsDelivr-served bundle only after the new URL has been stable for an agreed window (e.g. one week).
"Iterate" beyond Phase 4 is intentionally not a phase of this rebuild. Adding a new widget after the platform exists is a single-task piece of work, not a project — there is no spec for it.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| The convention-driven framework becomes a straitjacket for an unusual widget | The lower-level `mountWidget` API remains the escape hatch; widgets can drop down to it without leaving the runtime |
| `data-*`-based theme overrides allow arbitrary CSS values into the shadow root | Token schema validation rejects unknown tokens; values are written into typed CSS-variable declarations only, never injected as raw CSS |
| Vercel Blob + KV adds a moving part vs. pure static deploys | Static-deploy remains a viable fallback if Blob proves operationally heavier than expected (see Open Questions) |
| MP localStorage token is brittle and XSS-prone | Token handling is isolated to `MPLocalStorageAuth`; the rest of the system speaks only to `AuthProvider`, so a cookie-session replacement is a single swap |
| Bundle size growth with all-React-bundled-in | Per-widget budget: **500 KB gzipped** (revised upward in Phase 2 — the Phase 1 platform stack alone is ~200 KB gz: React 19 + ReactDOM + TanStack Query + zod + runtime; sermons additionally bundles react-pdf, HLS.js, framer-motion, luxon, nuqs, headlessui, and lucide-react, which is the basis for the raise). Tree-shaking verified at build. If multiple widgets push past the budget, the loader-script path can be extended to share React across bundles loaded together — out of scope for this rebuild |

## Phase specs

Each phase below will have its own design spec that resolves the open questions assigned to it. Implementation planning happens per-phase.

| Phase | Spec | Resolves |
|---|---|---|
| 1 — Foundation | `2026-05-22-perimeter-widgets-phase-1-foundation-design.md` (next, this session) | Vite-plugin codegen mechanics, Studio shell, Native render mode, baseline api-client surface |
| 2 — Sermons port | TBD when Phase 1 lands | Migrating an existing widget; verifying the contract end-to-end |
| 3 — Hosting + release | TBD when Phase 2 lands | OQ #1 (Blob vs static), OQ #3 (admin auth), release record schema, promotion/rollback UI |
| 4 — Cutover | TBD when Phase 3 lands | WordPress URL swap, monitoring, jsDelivr retirement |

## Open questions

Listed here with the phase that resolves each.

1. **Blob vs. static deploy for `apps/cdn`** — Resolved in Phase 3 spec. Umbrella recommends Blob.
2. **API client codegen vs. hand-written** — Resolved in Phase 1 spec. Default for Phase 1 is hand-written, scoped to what sermons needs; revisit if perimeter-api publishes an OpenAPI spec.
3. **Admin UI auth mechanism** — Resolved in Phase 3 spec. Likely MP OAuth or Vercel SSO.
4. **`@perimeter/ui` registry export** — Out of scope for this rebuild. Revisit once another project (helpdesk, metrics) asks. The component-file discipline keeps this cheap.
5. **Shared-state schema registration** — Schemas live in `@perimeter/shared-state`'s registry, keyed by namespaced key (e.g. `sermons:lastViewedId`). Schema is defined once by the owning widget; consumers `import` and pass it to `useSharedState`. If two widget versions disagree on shape, the older reader receives the parsed-or-null result and treats parse failure as an empty value. Detailed in the Phase that first uses shared-state.

## Out of scope

- Customer-facing or content-author-facing theme customization.
- Server-side rendering of widget HTML.
- Native mobile embedding.
- Per-WordPress-page widget pinning (would require an extra mapping layer in admin UI).
- Migrating `helpdesk`, `metrics`, or `perimeter-api` to consume `@perimeter/ui`.
