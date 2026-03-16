# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Turborepo monorepo of self-contained React widgets for embedding on perimeter.org (WordPress). Each widget compiles to a single IIFE script, renders inside a shadow DOM for style isolation, and fetches data from `api.perimeter.org` (perimeter-api).

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start widget storyboard (full widget previews) |
| `pnpm build` | Build all widgets to `dist/` |
| `pnpm build --filter=widget-sermons` | Build a single widget |
| `pnpm test` | Run all widget tests via Turborepo |
| `pnpm test --filter=widget-sermons` | Run tests for a single widget |
| `pnpm storybook` | Start Storybook for shared components |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm quality` | Run all checks (typecheck + lint + format + test) |

## Architecture

### Monorepo Packages

| Package | Name | Purpose |
| --- | --- | --- |
| `packages/shared/` | `@perimeter-widgets/shared` | API client, auth, shadow DOM mount, shared components, Tailwind preset |
| `packages/vite-preset/` | `@perimeter-widgets/vite-preset` | Shared Vite config factory for widgets |
| `packages/storyboard/` | `@perimeter-widgets/storyboard` | Dev preview app for full widget testing with MSW mocking |
| `packages/widget-*/` | `@perimeter-widgets/widget-*` | Individual widget packages |

### Widget Build Pipeline

Each widget is a Vite library mode build that produces a single IIFE JS file in `dist/<name>/<name>.js`. CSS is inlined into the JS via `?inline` imports for shadow DOM injection. React is bundled into each widget (WordPress doesn't provide it).

### Shadow DOM Mounting

Widgets mount via `mountWidget()` from `@perimeter-widgets/shared`:
1. Finds target `<div>` by element ID
2. Reads `data-*` attributes as config
3. Creates shadow root with injected styles
4. Renders React app with providers (QueryClient, auth, config)

### Auth

Reads MP OAuth token from `localStorage` (`mpp-widgets_AuthToken` / `mpp-widgets_ExpiresAfter`). Public widgets skip auth. Authenticated widgets attach token as `Authorization: Bearer <token>`.

### CDN Delivery

Built files in `dist/` are committed to the repo. Served via jsDelivr `@latest`. GitHub Action purges CDN cache on push to `main`.

## Critical Rules

- **Always use `pnpm`** — never npm or npx
- **Always create a branch** — never commit directly to `dev` or `main`
- **Merge target is `dev` only** — never merge directly to `main`
- **Never push to origin** — pushing is a manual task performed by the developer
- **Run `pnpm quality` before merging**
- **Conventional commits:** `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- **Use `--body-file` for PR bodies** (avoids ANSI escape code injection)
- **Read docs before code** — check `docs/superpowers/specs/` for design specs before modifying architecture

## Adding a New Widget

1. Create `packages/widget-<name>/` with entry point, components, hooks, tests
2. Add 3-line `vite.config.ts` using `createWidgetConfig()` from `@perimeter-widgets/vite-preset`
3. Add 1-line `vitest.config.ts` using `createWidgetTestConfig()`
4. Add preview in `packages/storyboard/src/previews/<name>.tsx`
5. `pnpm build --filter=widget-<name>` — output lands in `dist/<name>/`
6. Commit dist, push to main — GitHub Action purges jsDelivr
7. Add `<div>` + `<script>` tag on WordPress once — never touch it again

## API Integration

Widgets fetch from `api.perimeter.org` (perimeter-api). New widget endpoints follow perimeter-api's 5-layer architecture (Route -> Controller -> Service -> System -> Provider). See `../perimeter-api/CLAUDE.md` for API conventions.
