# Merge Style — Phase 3: Widgets Directory Rename Implementation Plan

**Goal:** Move `packages/widget-sermons/` → `widgets/sermons/`. Keep the npm package name (`@perimeter-widgets/widget-sermons`) unchanged to minimize consumer churn.

**Architecture:** Pure filesystem relocation. The Vite preset emits to `../../dist/${name}` which resolves to monorepo-root `dist/sermons/` regardless of source directory, so the jsDelivr path stays identical. `pnpm-workspace.yaml` already has `widgets/*` glob (added Phase 1). Storyboard's imports (`@perimeter-widgets/widget-sermons`) are package-name-based, not path-based, so they don't change.

**Spec:** `docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md`

**Branch:** `feat/widgets-directory-rename` off `dev`.

## File Map

| Action | File                                            | Notes                                                     |
| ------ | ----------------------------------------------- | --------------------------------------------------------- |
| Move   | `packages/widget-sermons/` → `widgets/sermons/` | `git mv` — entire directory                               |
| Modify | `CLAUDE.md` (perimeter-widgets)                 | Update package table row and "adding a new widget" step 1 |

Untouched (referenced but still working):

- `packages/storyboard/package.json` / `src/registry.ts` / `src/mocks/data/sermons.ts` — use `@perimeter-widgets/widget-sermons` as a package specifier; directory rename doesn't break this
- `scripts/generate-manifest.ts` — reads `dist/` directly, agnostic to source location
- `packages/vite-preset/src/index.ts` — `outDir: resolve(process.cwd(), `../../dist/${name}`)` works from either source location
- Design/plan docs that reference `packages/widget-sermons/` historically — those are historical records, leave as-is

## Execution

1. `git mv packages/widget-sermons widgets/sermons`
2. Update `CLAUDE.md` table: `packages/widget-*/` row → `widgets/<name>/` row
3. Update `CLAUDE.md` "Adding a New Widget" section step 1 to use `widgets/<name>/` path
4. `pnpm -w install` — pnpm re-resolves the workspace symlink
5. `pnpm -w build` — sermons widget emits to `dist/sermons/sermons.js` (unchanged path)
6. `pnpm -w quality` — all 14 turbo tasks pass, prettier clean
7. Push + open PR to `dev`
