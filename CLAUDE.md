# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Turborepo monorepo of self-contained React widgets for embedding on perimeter.org (WordPress). Each widget compiles to a single IIFE script, renders inside a shadow DOM for style isolation, and fetches data from `api.perimeter.org` (perimeter-api).

## Commands

| Command                              | Description                                       |
| ------------------------------------ | ------------------------------------------------- |
| `pnpm dev`                           | Start widget storyboard (full widget previews)    |
| `pnpm build`                         | Build all widgets to `dist/`                      |
| `pnpm build --filter=widget-sermons` | Build a single widget                             |
| `pnpm test`                          | Run all widget tests via Turborepo                |
| `pnpm test --filter=widget-sermons`  | Run tests for a single widget                     |
| `pnpm storybook`                     | Start Storybook v10 for shared components         |
| `pnpm lint`                          | Run ESLint across all packages                    |
| `pnpm typecheck`                     | TypeScript type checking                          |
| `pnpm quality`                       | Run all checks (typecheck + lint + format + test) |

## Architecture

### Monorepo Packages

| Package                 | Name                             | Purpose                                                                |
| ----------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| `packages/shared/`      | `@perimeter-widgets/shared`      | API client, auth, shadow DOM mount, shared components, Tailwind preset |
| `packages/vite-preset/` | `@perimeter-widgets/vite-preset` | Shared Vite config factory for widgets + `vite-tsconfig-paths`         |
| `packages/storyboard/`  | `@perimeter-widgets/storyboard`  | Dev preview app with MSW mocking, config editor, embed code generator  |
| `packages/widget-*/`    | `@perimeter-widgets/widget-*`    | Individual widget packages                                             |

### Widget Build Pipeline

Each widget is a Vite library mode build that produces a single IIFE JS file in `dist/<name>/<name>.js`. CSS is inlined into the JS via `?inline` imports for shadow DOM injection. React is bundled into each widget (WordPress doesn't provide it).

### Shadow DOM Mounting

Widgets mount via `mountWidget()` from `@perimeter-widgets/shared`:

1. Finds target `<div>` by element ID
2. Reads `data-*` attributes as config
3. Creates shadow root with injected styles (reuses existing on re-mount)
4. Renders React app with isolated QueryClient, auth, and config providers

### Auth

Reads MP OAuth token from `localStorage` (`mpp-widgets_AuthToken` / `mpp-widgets_ExpiresAfter`). Public widgets skip auth. Authenticated widgets attach token as `Authorization: Bearer <token>`.

### CDN Delivery

Built files in `dist/` are committed to the repo. Served via jsDelivr `@latest`. GitHub Action purges CDN cache on push to `main`.

### Storyboard

The storyboard (`pnpm dev`) provides:
- Widget registry with metadata and status (ready/skeleton/planned)
- Live config editor for data-* attributes with instant re-mount
- Auto-generated embed code snippets
- MSW mocking (skip with `VITE_API_MODE=local` to hit real API)

## Environment Variables

Defined in `env.d.ts` at monorepo root. Convention: `VITE_<DOMAIN>_<NAME>`.

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `localhost:5500` (dev) / `api.perimeter.org` (prod) | API base URL override |
| `VITE_API_MODE` | `mock` | `mock` (MSW) or `local` (real API) — storyboard only |

Setup: `cp .env.example .env.local` or inline: `VITE_API_MODE=local pnpm dev`

## Path Aliases

The storyboard uses `@/*` → `src/*` aliases (leaf package). Shared and widget packages use relative imports because they are consumed by other packages — path aliases in consumed packages break cross-package TypeScript resolution.

`vite-tsconfig-paths` syncs tsconfig paths to Vite automatically.

## Critical Rules

- **Always use `pnpm`** — never npm or npx
- **Always create a branch** — never commit directly to `dev` or `main`
- **Merge target is `dev` only** — never merge directly to `main`
- **Never push to origin** — pushing is a manual task performed by the developer
- **Run `pnpm quality` before merging**
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Use `--body-file` for PR bodies** (avoids ANSI escape code injection)
- **Read docs before code** — check `docs/` for architecture and guides before modifying the codebase

## Context Loading

**Always read the relevant doc BEFORE searching the codebase or writing code.**

| Working on... | Load first |
| --- | --- |
| Monorepo structure or build pipeline | `docs/architecture/overview.md` |
| Shared package (API, auth, mount, components) | `docs/architecture/shared-package.md` |
| Vite build config or test config | `docs/architecture/vite-preset.md` |
| CDN, jsDelivr, or deployment | `docs/architecture/cdn-deployment.md` |
| Sermons widget | `docs/widgets/sermons.md` |
| Developer setup or environment | `docs/guides/developer-setup.md` |
| Git workflow or conventions | `docs/guides/developer-rules.md` |
| Creating a new widget | `docs/guides/adding-a-widget.md` |
| Auth, MP tokens, or security | `docs/guides/authentication.md` |
| Writing or fixing tests | `docs/guides/testing.md` |
| WordPress embed patterns | `docs/reference/embed-guide.md` |
| Design tokens or colors | `docs/reference/design-tokens.md` |
| Unknown area | `docs/README.md` (full index) |

## Adding a New Widget

1. Create `packages/widget-<name>/` with entry point, components, hooks, tests
2. Add 3-line `vite.config.ts` using `createWidgetConfig()` from `@perimeter-widgets/vite-preset`
3. Add 1-line `vitest.config.ts` using `createWidgetTestConfig()`
4. Add entry to `packages/storyboard/src/registry.ts` with config fields
5. `pnpm build --filter=widget-<name>` — output lands in `dist/<name>/`
6. Commit dist, push to main — GitHub Action purges jsDelivr
7. Add `<div>` + `<script>` tag on WordPress once — never touch it again

## API Integration

Widgets fetch from `api.perimeter.org` (perimeter-api) in production, `localhost:5500` in development. New widget endpoints follow perimeter-api's 5-layer architecture (Route -> Controller -> Service -> System -> Provider). See `../perimeter-api/CLAUDE.md` for API conventions.
