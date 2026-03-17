# Perimeter Widgets — Architecture Design Spec

> **Date:** 2026-03-16
> **Status:** Approved
> **Repo:** `perimeter-widgets`

## Overview

A Turborepo monorepo of self-contained React widgets that compile to production scripts for embedding on perimeter.org (WordPress). Each widget renders inside a shadow DOM for style isolation, fetches data from `api.perimeter.org` (perimeter-api), and is served via jsDelivr CDN directly from the GitHub repository.

First widget: **Sermons** — search/browse sermon series and individual sermons, with a watch/listen view.

## Tech Stack

| Concern               | Choice                              |
| --------------------- | ----------------------------------- |
| Monorepo              | pnpm workspaces + Turborepo         |
| Framework             | React 19 + TypeScript               |
| Styling               | Tailwind v4 (shared preset)         |
| Build                 | Vite (library mode, IIFE output)    |
| Data fetching         | React Query v5                      |
| API server            | perimeter-api (`api.perimeter.org`) |
| Testing               | Vitest + React Testing Library      |
| Shared component docs | Storybook (Vite builder)            |
| Widget previews       | Custom storyboard app (MSW mocking) |
| Style isolation       | Shadow DOM                          |
| Auth                  | MP OAuth token from `localStorage`  |
| CDN                   | jsDelivr (`@latest` + cache purge)  |
| CI                    | GitHub Actions (build, purge)       |

## Monorepo Structure

```
perimeter-widgets/
├── packages/
│   ├── shared/                  ← @perimeter-widgets/shared
│   │   ├── src/
│   │   │   ├── api/             ← API client, React Query provider, base URL config
│   │   │   ├── auth/            ← MP token reader (localStorage), auth context
│   │   │   ├── components/      ← Shared UI primitives (buttons, cards, loaders)
│   │   │   ├── styles/          ← Tailwind preset, base CSS, design tokens
│   │   │   ├── shadow-dom/      ← Shadow DOM mount utility + style injection
│   │   │   └── utils/           ← Common helpers
│   │   ├── .storybook/
│   │   │   ├── main.ts          ← Storybook config (Vite builder)
│   │   │   └── preview.ts       ← Tailwind CSS + design tokens
│   │   ├── tailwind.preset.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── vite-preset/             ← @perimeter-widgets/vite-preset
│   │   ├── src/
│   │   │   └── index.ts         ← createWidgetConfig() + createWidgetTestConfig()
│   │   └── package.json
│   │
│   ├── storyboard/              ← @perimeter-widgets/storyboard
│   │   ├── src/
│   │   │   ├── main.tsx         ← Vite dev entry
│   │   │   ├── App.tsx          ← Widget picker / navigation
│   │   │   ├── previews/        ← Per-widget preview files
│   │   │   └── mocks/
│   │   │       ├── handlers.ts  ← MSW handlers for API mocking
│   │   │       └── data/        ← Mock data per widget
│   │   ├── index.html
│   │   ├── vite.config.ts       ← Standard Vite dev server (not library mode)
│   │   └── package.json
│   │
│   └── widget-sermons/          ← @perimeter-widgets/widget-sermons
│       ├── src/
│       │   ├── index.tsx         ← Entry point (mounts into shadow DOM)
│       │   ├── App.tsx           ← Root component with providers
│       │   ├── components/
│       │   │   ├── SermonSearch.tsx
│       │   │   ├── SermonPlayer.tsx
│       │   │   └── __tests__/
│       │   │       └── SermonSearch.test.tsx
│       │   ├── hooks/
│       │   │   ├── use-sermons.ts
│       │   │   └── __tests__/
│       │   │       └── use-sermons.test.ts
│       │   └── types.ts
│       ├── vite.config.ts        ← 3-line config using preset
│       ├── vitest.config.ts      ← 1-line config using preset
│       ├── package.json
│       └── tsconfig.json
│
├── dist/                         ← Committed build output (CDN-served)
│   └── sermons/
│       └── sermons.js            ← Single self-contained IIFE
│
├── .github/
│   └── workflows/
│       └── build-and-purge.yml   ← Build, commit dist, purge jsDelivr
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── CLAUDE.md
```

## Shadow DOM Mounting

### Mount Utility

`@perimeter-widgets/shared` exports `mountWidget()`:

```typescript
mountWidget({
    elementId: 'perimeter-sermons',
    component: SermonsApp,
    styles: widgetStyles, // compiled Tailwind CSS string
});
```

**Lifecycle:**

1. Finds `<div id="perimeter-sermons">` in the DOM
2. Reads all `data-*` attributes as widget config props
3. Creates a `shadowRoot` (mode `'open'`) on that element
4. Injects a `<style>` tag with compiled Tailwind CSS into the shadow root
5. Creates a fresh `QueryClient` instance (each widget gets its own — prevents cache collisions when multiple widgets are on the same page)
6. Creates a React root inside the shadow root
7. Renders the component wrapped with providers (QueryClientProvider, auth context, config context)
8. Returns a `destroy()` function for cleanup (exists for SPA contexts; not needed for traditional WordPress full-page navigations)

### Widget Entry Point

```typescript
// packages/widget-sermons/src/index.tsx
import { mountWidget } from '@perimeter-widgets/shared';
import { SermonsApp } from './App';
import styles from './styles.css?inline';

mountWidget({
    elementId: 'perimeter-sermons',
    component: SermonsApp,
    styles,
});
```

### CSS Strategy

Tailwind CSS is compiled and imported as a string via Vite's `?inline` import. `mountWidget()` injects it into the shadow root as a `<style>` tag. No CSS leaks out, no WordPress styles leak in.

### Config Resolution

`mountWidget()` reads data attributes from the target element and merges with defaults:

```typescript
// <div id="perimeter-sermons" data-campus="buckhead" data-per-page="12">
// Produces: { campus: 'buckhead', perPage: 12 }
// Merged with: { perPage: 10, apiBaseUrl: 'https://api.perimeter.org' }
```

Each widget defines a Zod schema for its config. Invalid attributes produce clear error messages in dev.

### WordPress Embed

```html
<div id="perimeter-sermons" data-campus="buckhead" data-per-page="12"></div>
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/sermons/sermons.js"></script>
```

No config objects, no init calls. Set once, never change.

**Loading state:** The target `<div>` can contain lightweight placeholder HTML (e.g., a CSS skeleton) that is replaced when the widget mounts. This prevents a blank gap on slow connections:

```html
<div id="perimeter-sermons" data-campus="buckhead">
    <div
        style="min-height:200px;background:#f5f5f4;border-radius:8px;animate:pulse"
    ></div>
</div>
```

## API Client & Auth

### API Client

```typescript
const client = createApiClient({
    baseUrl: 'https://api.perimeter.org', // overridable via data-api-url
});

const sermons = await client.get<Sermon[]>('/api/sermons');
```

- Unwraps perimeter-api's `{ success, data }` response envelope
- Attaches MP OAuth token when available and widget requires auth
- Typed responses via generics
- Surfaces perimeter-api error codes
- On 401 response, marks auth state as expired and surfaces a "session expired" message to the user (token refresh is handled by WordPress's MP OAuth flow — a page reload picks up the new token)

### Local Development

The storyboard uses **MSW exclusively** for API mocking in development — no real API connection needed. For end-to-end testing against a real API, run perimeter-api locally and override via `data-api-url="http://localhost:3000"` on the widget's target element. The storyboard supports this override in its preview config.

### React Query Defaults

```typescript
{
  queries: {
    staleTime: 5 * 60 * 1000,     // 5 minutes (matches perimeter-api cache TTLs)
    retry: 1,
    refetchOnWindowFocus: false,   // embedded widgets, not full apps
  }
}
```

Widgets define hierarchical query keys following the same pattern as perimeter-api:

```typescript
export const sermonKeys = {
    all: ['sermons'] as const,
    list: (filters?: SermonFilters) =>
        [...sermonKeys.all, 'list', filters] as const,
    detail: (id: string) => [...sermonKeys.all, 'detail', id] as const,
    series: () => [...sermonKeys.all, 'series'] as const,
};
```

### MP Token Auth

Reads from `localStorage` keys set by WordPress's MP OAuth integration:

- **`mpp-widgets_AuthToken`** — the OAuth access token
- **`mpp-widgets_ExpiresAfter`** — token expiration timestamp

```typescript
function getMPToken(): MPAuthState {
    const token = localStorage.getItem('mpp-widgets_AuthToken');
    const expiresAfter = localStorage.getItem('mpp-widgets_ExpiresAfter');

    if (!token || token === 'null' || token.length < 10)
        return { authenticated: false };
    if (expiresAfter && new Date(expiresAfter) < new Date())
        return { authenticated: false };

    return { authenticated: true, token };
}
```

- Token attached as `Authorization: Bearer <token>` on authenticated requests
- `AuthContext` provider exposes `{ authenticated, token }` to components
- Public widgets skip auth entirely — token only attached when `requiresAuth: true`
- Widget never handles OAuth flows — it consumes what WordPress already stored

### Auth Flow

```
Widget loads → getMPToken() → token exists & valid?
  ├── Yes → attach to API requests, render authenticated UI
  └── No  → render public fallback or "Sign in" prompt
            (sign-in goes through WordPress's MP OAuth flow,
             populates localStorage, page reload picks it up)
```

## Vite Preset & Build Pipeline

### Vite Preset

`@perimeter-widgets/vite-preset` exports:

- **`createWidgetConfig({ name, entry })`** — Vite library mode config
    - IIFE output format (single script tag compatible)
    - Output to `../../dist/<name>/<name>.js`
    - CSS inlined via `?inline` imports
    - React bundled into each widget (WordPress doesn't provide React)
    - Tailwind v4 with shared preset
    - Minification + tree-shaking in production
    - Global name: `PerimeterWidget_<Name>` (avoids collisions)
- **`createWidgetTestConfig()`** — Vitest config with jsdom, React Testing Library

### Per-Widget Config

```typescript
// packages/widget-sermons/vite.config.ts
import { createWidgetConfig } from '@perimeter-widgets/vite-preset';

export default createWidgetConfig({
    name: 'sermons',
    entry: 'src/index.tsx',
});
```

### React Bundling

Each widget bundles its own React, scoped within the IIFE closure. No conflicts between multiple widgets on the same page. Tradeoff is ~40KB gzipped per widget for React — acceptable for 1-3 widgets per page with CDN caching. Can revisit with a shared React bundle if widget density grows.

### Build Output

```
dist/
├── sermons/
│   └── sermons.js       ← single self-contained IIFE (~80-150KB gzipped)
└── manifest.json         ← generated by build script
```

The `manifest.json` is generated during the Turbo build pipeline. Schema:

```json
{
    "widgets": {
        "sermons": {
            "file": "dist/sermons/sermons.js",
            "sizeBytes": 145000,
            "buildTimestamp": "2026-03-16T12:00:00Z"
        }
    }
}
```

The GitHub Action reads this to determine which files to purge from jsDelivr.

### Rollback Procedure

Since WordPress embeds use `@latest`, a broken build affects production immediately. To roll back:

1. `git revert <broken-commit>` (reverts the dist changes)
2. Push to `main`
3. GitHub Action purges jsDelivr cache for affected files
4. jsDelivr serves the reverted (known-good) dist files

### Turbo Pipeline

```jsonc
{
    "tasks": {
        "build": {
            "dependsOn": ["^build"],
            "outputs": ["dist/**"],
        },
        "test": {
            "dependsOn": ["^build"],
        },
        "dev": {
            "cache": false,
            "persistent": true,
        },
        "storybook": {
            "cache": false,
            "persistent": true,
        },
        "lint": {},
        "typecheck": {},
    },
}
```

### GitHub Action: Build & Purge

On push to `main`:

1. Install deps, run `turbo build`
2. Commit `dist/` changes (if any)
3. Read `manifest.json` for changed widget files
4. Purge jsDelivr cache via `https://purge.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/...` for each changed file

## Testing & Dev Preview

### Per-Widget Tests

Tests co-located with source:

```
packages/widget-sermons/src/
├── components/
│   ├── SermonSearch.tsx
│   └── __tests__/
│       └── SermonSearch.test.tsx
├── hooks/
│   ├── use-sermons.ts
│   └── __tests__/
│       └── use-sermons.test.ts
```

Vitest config is a one-liner using `createWidgetTestConfig()`. Turborepo caches test results — unchanged widgets skip tests.

### Storybook (Shared Components)

`packages/shared/.storybook/` — Storybook with Vite builder for shared UI primitives. Stories co-located next to components (`Button.stories.tsx` alongside `Button.tsx`). Tailwind preset + design tokens loaded in preview config.

### Storyboard (Full Widget Previews)

`packages/storyboard/` — custom Vite app that renders full widgets in shadow DOM with MSW mocking:

- Each preview file renders a widget with configurable data attributes
- Widgets render inside shadow DOM just like production
- MSW intercepts API calls with mock data (no real API needed)
- Toggleable states: loading, error, authenticated vs public, different configs

### Dev Commands

| Command                              | Description                                       |
| ------------------------------------ | ------------------------------------------------- |
| `pnpm dev`                           | Start widget storyboard (full widget previews)    |
| `pnpm storybook`                     | Start Storybook for shared components             |
| `pnpm test`                          | Run all widget tests via Turborepo                |
| `pnpm test --filter=widget-sermons`  | Run tests for a single widget                     |
| `pnpm build`                         | Build all widgets to `dist/`                      |
| `pnpm build --filter=widget-sermons` | Build a single widget                             |
| `pnpm quality`                       | Run all checks (typecheck + lint + format + test) |

## Perimeter-API Integration

### Sermons Domain

New routes in perimeter-api under `(public)` (no auth required):

```
perimeter-api/src/
├── app/api/(public)/sermons/
│   ├── route.ts                    ← GET /api/sermons (list/search)
│   ├── [id]/route.ts              ← GET /api/sermons/:id (detail)
│   └── series/
│       ├── route.ts               ← GET /api/sermons/series
│       └── [id]/route.ts          ← GET /api/sermons/series/:id
├── controllers/sermons/
│   └── sermons-controller.ts
├── services/sermons/
│   └── sermons-service.ts
├── systems/mp/sermons/             ← MP-backed (sermon data lives in MP tables)
│   └── sermons-system.ts
└── data/models/sermons/
    └── index.ts                    ← Zod schemas
```

Follows perimeter-api's 5-layer architecture: Route → Controller → Service → System → Provider. The `sermons-system.ts` delegates to the existing `MPProvider` singleton for MP REST API queries. MP table schemas will be discovered during implementation via `pnpm mp-explore tables --filter "Sermon"`. Zod schemas for Sermon, SermonSeries, and SermonFilters will be defined based on the discovered MP table structure. CORS for `perimeter.org` is already configured.

## Adding a New Widget

1. Create `packages/widget-<name>/` with entry point, components, hooks, tests
2. Add 3-line `vite.config.ts` and 1-line `vitest.config.ts` using presets
3. Add preview in `packages/storyboard/src/previews/<name>.tsx`
4. Add corresponding API routes in perimeter-api if needed (5-layer pattern)
5. `pnpm build --filter=widget-<name>` — output lands in `dist/<name>/`
6. Commit dist, push to main — GitHub Action purges jsDelivr
7. Add `<div>` + `<script>` tag on WordPress once — never touch it again

## Developer Rules

Matching perimeter-api conventions:

- **Always use `pnpm`** — never npm or npx
- **Always create a branch** — never commit directly to `dev` or `main`
- **Merge target is `dev`** — never merge directly to `main`
- **Never push to origin** — manual task
- **Conventional commits** — `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Run `pnpm quality` before merging**
- **Use `--body-file` for PR bodies** (avoids ANSI escape code injection)
