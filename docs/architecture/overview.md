# Architecture Overview

> **Scope:** Monorepo structure, package roles, build pipeline, shadow DOM mounting, widget lifecycle
> **Key files:** `turbo.json`, `pnpm-workspace.yaml`, `packages/shared/src/shadow-dom/mount.tsx`
> **Last verified:** 2026-03-17

---

## Monorepo Structure

```
perimeter-widgets/
├── packages/
│   ├── shared/              ← @perimeter-widgets/shared
│   ├── vite-preset/         ← @perimeter-widgets/vite-preset
│   ├── storyboard/          ← @perimeter-widgets/storyboard
│   └── widget-sermons/      ← @perimeter-widgets/widget-sermons
├── dist/                    ← Committed build output (CDN-served)
├── scripts/                 ← Build scripts (manifest generator)
├── .github/workflows/       ← CI/CD
├── turbo.json
└── pnpm-workspace.yaml
```

## Package Roles

| Package                          | Type       | Purpose                                                               |
| -------------------------------- | ---------- | --------------------------------------------------------------------- |
| `@perimeter-widgets/shared`      | Library    | API client, auth, shadow DOM mount, shared components, design tokens  |
| `@perimeter-widgets/vite-preset` | Build tool | Shared Vite config factory — eliminates per-widget config duplication |
| `@perimeter-widgets/storyboard`  | Dev tool   | Full widget preview app with MSW mocking (not built for production)   |
| `@perimeter-widgets/widget-*`    | Widget     | Individual embeddable widgets — each builds to a single IIFE          |

## Widget Build Pipeline

Each widget is a Vite library mode build that produces a single self-contained IIFE JavaScript file.

```
Widget Source → Vite (library mode) → IIFE bundle → dist/<name>/<name>.js
                                         ↑
                              React bundled in (WordPress doesn't provide it)
                              CSS inlined via ?inline imports (for shadow DOM)
                              Tailwind v4 processed via @tailwindcss/vite
```

**Output:** `dist/<name>/<name>.js` — a single `<script>` tag loads everything the widget needs.

**Size:** ~72KB gzipped per widget (includes React 19). CDN caching means repeat visits are instant.

## Shadow DOM Mounting

Every widget mounts via `mountWidget()` from `@perimeter-widgets/shared`:

```
WordPress Page
  ├── <div id="perimeter-sermons" data-campus="buckhead">  ← target element
  │     └── #shadow-root (open)                             ← style isolation
  │           ├── <style>...</style>                         ← Tailwind CSS injected
  │           └── <div id="widget-root">                    ← React root
  │                 └── <QueryClientProvider>                ← isolated QueryClient
  │                       └── <AuthProvider>                 ← MP token context
  │                             └── <ConfigProvider>         ← data-* attributes
  │                                   └── <WidgetApp />      ← widget component
  └── <script src="...sermons.js"></script>                  ← loads and auto-mounts
```

### Lifecycle

1. Script loads and executes `mountWidget({ elementId, component, styles })`
2. Finds target `<div>` by ID, reads `data-*` attributes as config
3. Creates shadow root (reuses existing on re-mount for HMR)
4. Injects compiled Tailwind CSS as `<style>` tag inside shadow root
5. Creates fresh `QueryClient` (isolated per widget — no cache collisions)
6. Renders React tree with providers inside shadow root
7. Returns `destroy()` function for cleanup

### Config Resolution

Widget config comes from `data-*` attributes on the target element, merged with defaults:

```html
<div id="perimeter-sermons" data-campus="buckhead" data-per-page="12"></div>
```

Produces: `{ campus: 'buckhead', perPage: 12 }` (kebab-case auto-converted to camelCase, numbers and booleans auto-parsed).

Each widget defines a Zod schema for its config — invalid attributes produce clear error messages in dev.

## Turborepo Pipeline

```jsonc
{
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true },
    "storybook": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": {},
}
```

Build caching means unchanged widgets skip rebuilds. The `postbuild` script auto-generates `dist/manifest.json`.

## Related Docs

- [Shared Package](shared-package.md) — API client, auth, components, mount utility
- [Vite Preset](vite-preset.md) — Build config factory
- [CDN & Deployment](cdn-deployment.md) — jsDelivr, cache purging, GitHub Action
- [Adding a Widget](../guides/adding-a-widget.md) — Step-by-step new widget guide
