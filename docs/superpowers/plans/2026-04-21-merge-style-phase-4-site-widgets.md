# Merge Style — Phase 4: Site Subsumes Storyboard Implementation Plan

**Goal:** Retire `packages/storyboard/`. The Next.js site at `apps/site/` takes over widget preview, config editor, and embed snippet generation via new routes at `/widgets` and `/widgets/[slug]`.

**Architecture:** Widgets load into the site via their already-built IIFE bundles (the same files WordPress consumes via jsDelivr) — not via workspace `import()`. A build step copies `dist/<widget>/<widget>.js` into `apps/site/public/widget-bundles/`. The preview page injects a `<script>` tag, renders the widget's target `<div>` with configurable `data-*` attributes, and reuses the widget's self-mounting behavior. Config changes force a re-mount by re-keying the target element. MSW mock integration is deferred to a follow-up PR so this phase can land quickly; widget dev can still target a local API via `VITE_API_URL=localhost:5500` or real production.

**Spec:** `docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md`

**Branch:** `feat/site-subsumes-storyboard` off `dev`.

## Scope

In this PR:

- `apps/site/src/app/widgets/page.tsx` — list all registered widgets with status indicator
- `apps/site/src/app/widgets/[slug]/page.tsx` + client components — widget preview (shadow DOM), live config editor, embed code snippet
- `apps/site/src/lib/widgets-registry.ts` — widget metadata ported from `packages/storyboard/src/registry.ts`
- `apps/site/public/widget-bundles/` — copy of built widget IIFEs for the preview to load
- `apps/site/scripts/copy-widget-bundles.ts` — copy step before `next build`/`next dev`
- `packages/storyboard/` — fully deleted
- Root `pnpm dev` flips to site
- Top-nav gets a Widgets link
- CLAUDE.md updated: drop storyboard rows, update dev command, add widgets preview section

Deferred to a follow-up PR:

- MSW mock handlers in the site (storyboard's `packages/storyboard/src/mocks/` is also deleted — will be rebuilt in the follow-up rather than ported as-is because Next.js's MSW integration has its own conventions)
- `DataSourceToggle` — removed from UI until MSW comes back; for now widget previews hit whatever API is configured via env

## File Map

| Action | File                                                         | Notes                                                                                                                       |
| ------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Create | `apps/site/src/lib/widgets-registry.ts`                      | Ported from `packages/storyboard/src/registry.ts`; strip the `load()` dynamic-import (widgets now load via IIFE script tag) |
| Create | `apps/site/src/app/widgets/page.tsx`                         | Server component; lists widgets                                                                                             |
| Create | `apps/site/src/app/widgets/[slug]/page.tsx`                  | Server wrapper with `generateStaticParams`; renders the client preview                                                      |
| Create | `apps/site/src/app/widgets/[slug]/widget-preview-client.tsx` | Client component: shadow-DOM mount via script tag + config editor + embed snippet                                           |
| Create | `apps/site/src/components/widgets/config-editor.tsx`         | Ported from `packages/storyboard/src/components/ConfigEditor.tsx`                                                           |
| Create | `apps/site/src/components/widgets/embed-snippet.tsx`         | Generates the `<div>` + `<script>` embed code from current config                                                           |
| Create | `apps/site/scripts/copy-widget-bundles.ts`                   | Copies `dist/*/` → `apps/site/public/widget-bundles/`                                                                       |
| Modify | `apps/site/package.json`                                     | Add `copy:widgets` to build/dev chain                                                                                       |
| Modify | `apps/site/src/components/site/top-nav.tsx`                  | Add Widgets link                                                                                                            |
| Delete | `packages/storyboard/`                                       | Entire package, including `.storybook/`, `vite.config.ts`, mocks                                                            |
| Modify | `pnpm-workspace.yaml`                                        | Remove storyboard-specific workerDirectory (it's in root package.json.msw)                                                  |
| Modify | `package.json` (root)                                        | `dev` → `turbo dev --filter=@perimeter-widgets/site`; remove `msw.workerDirectory`                                          |
| Modify | `CLAUDE.md`                                                  | Drop storyboard rows from package table; update commands; add `/widgets` preview section                                    |

## Execution (single branch)

1. Create the new files under `apps/site/src/`
2. Create the copy script + wire into `apps/site/package.json` scripts
3. `git rm -r packages/storyboard/`
4. Flip root `pnpm dev` + drop msw.workerDirectory
5. Update CLAUDE.md
6. `pnpm -w install`
7. `pnpm -w build` — exercise the new flow end-to-end
8. `pnpm -w quality` — 14/14 tasks pass, prettier clean (site goes up to 15 tasks now; storyboard is gone so net change = 0)
9. Manual smoke: `pnpm dev` → `/widgets` lists sermons; `/widgets/sermons` renders the widget with config editor
10. Commit + push + PR to dev
