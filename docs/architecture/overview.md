# Architecture Overview

> **Scope:** Monorepo structure, package roles, build pipeline, the single shadow-DOM mount path
> **Key files:** `turbo.json`, `pnpm-workspace.yaml`, `packages/widget-runtime/src/mount.tsx`

---

## Monorepo Structure

```
perimeter-widgets/
├── packages/
│   ├── theme/                ← @perimeter/theme — design tokens, resolveTokens, rewriteRootToHost
│   ├── widget-runtime/       ← @perimeter/widget-runtime — mount, autoMount, defineWidget, styling
│   ├── vite-plugin-widget/   ← @perimeter/vite-plugin-widget — widgetConfig() build helper
│   ├── auth/                 ← @perimeter/auth — auth providers (MPLocalStorageAuth)
│   ├── api-client/           ← @perimeter/api-client — typed API client
│   ├── api-hooks/            ← @perimeter/api-hooks — React Query hooks + generated operation types
│   ├── ui/                   ← @perimeter/ui — shadcn components + cn + hooks
│   └── release/              ← @perimeter/release — create-widget + release tooling (dev-only)
├── widgets/
│   ├── example/              ← reference widget
│   └── sermons/              ← first production widget
├── studio/                   ← Vite studio (dev harness + deployed design-system site)
├── cdn/                      ← committed static hosting dir (its own Vercel static project)
├── turbo.json
└── pnpm-workspace.yaml
```

## Package Roles

| Package                         | Type       | Purpose                                                                    |
| ------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `@perimeter/theme`              | Library    | Design tokens (px radii), `resolveTokens`, `rewriteRootToHost`             |
| `@perimeter/widget-runtime`     | Library    | `mount`, `autoMount`, `defineWidget`, the shadow-DOM `styling` module      |
| `@perimeter/vite-plugin-widget` | Build tool | `widgetConfig()` Vite-config helper (rem→px, single-IIFE build)           |
| `@perimeter/auth`               | Library    | Auth providers (`MPLocalStorageAuth`)                                      |
| `@perimeter/api-client`         | Library    | Typed API client (`fetchJson`, `serializeQuery`)                           |
| `@perimeter/api-hooks`          | Library    | React Query hooks + generated operation types (absorbed the old api-types) |
| `@perimeter/ui`                 | Library    | shadcn components + `cn` + hooks                                           |
| `@perimeter/release`            | Dev tool   | `pnpm create-widget` + `pnpm release` (nothing ships inside a widget)      |
| `@perimeter/widget-<name>`      | Widget     | An individual embeddable widget — builds to a single IIFE                  |

`studio/` (`@perimeter/studio`) is the Vite studio: it is both the local dev harness (`pnpm dev`) and the deployed read-only design-system site at `style.perimeter.org`.

## Widget Build Pipeline

Each widget is a Vite library-mode build that produces a single self-contained IIFE JavaScript file.

```
src/entry.ts → widgetConfig() (Vite) → IIFE bundle → widgets/<name>/dist/index.js
                                          ↑
                              React bundled in (WordPress doesn't provide it)
                              CSS imported as a ?inline string (injected into the shadow root)
                              Inline rem→px PostCSS transform (host-page font-size immune)
                              NODE_ENV pinned to production; version injected from package.json
```

**Output:** `widgets/<name>/dist/index.js` — a single `<script>` tag loads everything the widget needs. `pnpm release <name> --patch|--minor|--major` copies this immutable bundle into `cdn/<name>/<version>/index.js`, served by the static `cdn/` Vercel project at `widgets.perimeter.org`.

**Size:** per-widget gzipped budget enforced by a `tests/bundle.test.ts` check (sermons' budget is 900 KiB). Immutable, year-cached versioned URLs mean repeat visits are instant.

## The single mount path

There is one render path — `mount(host, definition, css, overrides?)` from `@perimeter/widget-runtime` — and it is the same code in the studio (dev) and in the shipped IIFE (prod). What you see in the studio is what production renders.

```
WordPress Page
  ├── <div data-perimeter-widget="sermons" data-per-page="12">  ← target element
  │     └── #shadow-root (open)                                 ← style isolation
  │           ├── adoptedStyleSheets / <style>                  ← compiled CSS injected
  │           └── React root                                    ← mounted widget
  │                 └── providers (QueryClient, auth, config)   ← per-widget, isolated
  │                       └── <App config={…} auth={…} />        ← the widget component
  └── <script src="…/loader.js"></script>                        ← resolves + auto-mounts
```

### Lifecycle

1. `entry.ts` imports the compiled CSS as a `?inline` string, then calls `ensureGlobal(widget, css)` and `autoMount(widget, css)`.
2. `autoMount` scans the page for `[data-perimeter-widget="<name>"]` targets and reads their `data-*` attributes.
3. `mount()` attaches an open shadow root (reused on re-mount for HMR).
4. The `styling` module injects the compiled CSS via `adoptedStyleSheets` (with a `<style>` fallback) and rewrites `:root` → `:host`.
5. A fresh, per-widget provider stack (QueryClient, auth, config) renders the React tree inside the shadow root.
6. `mount()` returns a handle whose `destroy()` cleans up.

### Config Resolution

Widget config comes from `data-*` attributes on the target element, validated against the widget's zod schema:

```html
<div data-perimeter-widget="sermons" data-per-page="12" data-default-view="grid"></div>
```

Produces `{ perPage: 12, defaultView: 'grid' }` — kebab-case auto-converts to camelCase, and `z.coerce` in the schema turns the string `data-*` values into numbers/booleans. Invalid attributes surface clear errors in dev. (`data-theme-*` attributes are reserved for token overrides and are not passed to the schema.)

### Auth

`defineWidget({ auth })` takes an `AuthMode` of `'none' | 'optional' | 'required'`. Inside a widget, `useAuth()` returns the active `AuthProvider`; the default provider is `MPLocalStorageAuth`, which reads the MP OAuth token WordPress stored in `localStorage`. See [Authentication](../guides/authentication.md).

## Turborepo Pipeline

Build caching means unchanged packages skip rebuilds. Hosting is decoupled from the build: `pnpm release <name>` copies a built bundle into the committed `cdn/` static directory and updates `cdn/manifest.json` (the single mutable pointer). See [Hosting & Release](../hosting-and-release.md).

## Related Docs

- [Hosting & Release](../hosting-and-release.md) — the `cdn/` model, `pnpm release`, promote/rollback, embed snippets
- [CDN & Deployment](cdn-deployment.md) — short summary that redirects to the hosting doc
- [Creating a widget](../creating-a-widget.md) — scaffold and build a new widget end-to-end
- [Authentication](../guides/authentication.md) — MP OAuth token from WordPress, auth modes
