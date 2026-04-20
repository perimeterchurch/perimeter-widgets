# Merge `style/` into `perimeter-widgets/`

> **Date:** 2026-04-20
> **Scope:** Consolidate the two projects into a single monorepo. `perimeter-widgets/` absorbs `style/`'s showcase app, registry source, themes, and templates. The merged project continues to publish the shadcn registry at `style.perimeter.org/r` and deploys the showcase at `style.perimeter.org`.
> **Supersedes:** `2026-04-08-style-registry-sync-design.md` — the external-sync approach is retired in favor of a single in-monorepo source of truth.

---

## Context

The `style/` project (Next.js 16, standalone repo, deployed at `style.perimeter.org`) is the canonical shadcn registry for Perimeter. It owns 38 components, 3 themes, 5 page templates, and a showcase site with interactive demos. Its registry is served as JSON at `style.perimeter.org/r/*.json` and installed by other projects via `pnpm dlx shadcn@latest add @perimeter/<name>`.

The `perimeter-widgets/` monorepo (Turborepo, Vite) builds self-contained IIFE widgets that embed on `perimeter.org` via shadow DOM. Today it consumes style's components through a sync script (`sync:style`) that runs the shadcn CLI and copies components into `packages/shared/src/components/ui/perimeter/`. Token values are fetched from `https://style.perimeter.org/r/default-theme.json` by `sync:tokens`. Both are manual flows; they drift silently, require `shared`-specific wrapper duplicates (`button.tsx`, `dialog.tsx`, `input.tsx`, `textarea.tsx`, `input-group.tsx`) to work around import-path rewrites, and mean a round trip through a public URL to get the latest tokens.

The friction is structural: style and widgets are the same design system viewed from two ends. Merging them eliminates the sync pipeline, the wrapper duplicates, and the drift risk, and gives us a single place to evolve components, themes, widgets, docs, and design-system documentation.

## Design Principles

1. **Single source of truth for components.** Registry source lives in one place; widgets and site both import from it. No syncing.
2. **No change to external consumers.** `style.perimeter.org/r` keeps serving the same JSON at the same paths with the same component names. Install commands used by `metrics/`, `perimeter-api/`, and any other downstream consumer continue to work without modification.
3. **Preserve history.** Component evolution happens across hundreds of style commits. Subtree-merge style's git history so `git blame` and `git log` still reach back.
4. **Phased rollout.** Each phase is independently mergeable, leaves `dev` deployable, and lands as its own PR. No single massive PR.
5. **Retire the storyboard.** Widget previews, config editor, MSW mocks, and embed-code generation move into the merged site. One showcase app instead of two.
6. **Design-system pages scale.** The merged site ships a multi-page `/design` section (colors, typography, spacing, borders, branding) rather than a single tokens page.

## Target Monorepo Layout

```
perimeter-widgets/
├── apps/
│   └── site/                              # Next.js 16 showcase (merged style app)
│       ├── src/app/
│       │   ├── page.tsx                   # home
│       │   ├── widgets/                   # subsumes storyboard
│       │   │   ├── page.tsx               # widget list
│       │   │   └── [slug]/page.tsx        # preview + config editor + embed
│       │   ├── components/                # from style
│       │   │   ├── page.tsx
│       │   │   └── [category]/[slug]/page.tsx
│       │   ├── templates/                 # from style
│       │   │   ├── page.tsx
│       │   │   └── [slug]/page.tsx
│       │   ├── design/                    # multi-page (new)
│       │   │   ├── page.tsx               # index
│       │   │   ├── colors/page.tsx
│       │   │   ├── typography/page.tsx
│       │   │   ├── spacing/page.tsx
│       │   │   ├── borders/page.tsx
│       │   │   └── branding/page.tsx
│       │   ├── docs/                      # from style
│       │   └── changelog/                 # from style
│       ├── src/components/site/           # nav, sidebar, search, playground, code-block
│       ├── src/lib/                       # demo-types, highlight, extract-source
│       ├── src/mocks/                     # MSW handlers (moved from storyboard)
│       ├── scripts/                       # collect-demos, generate-theme-css, copy-registry, sitemap
│       ├── public/r/                      # shadcn build output (copied from registry package)
│       ├── public/brand/                  # brand assets for /design/branding
│       ├── next.config.ts
│       └── package.json                   # @perimeter-widgets/site
│
├── packages/
│   ├── registry/                          # single source of truth
│   │   ├── ui/perimeter/*.tsx             # 38 components
│   │   ├── ui/perimeter/*.demo.tsx
│   │   ├── ui/perimeter/lib/
│   │   ├── themes/*.json                  # default, perimeter-api, metrics
│   │   ├── registry.json                  # shadcn CLI manifest
│   │   ├── src/index.ts                   # workspace re-exports
│   │   ├── tsconfig.json                  # @/ aliases for on-disk shadcn compatibility
│   │   └── package.json                   # @perimeter-widgets/registry
│   ├── shared/                            # runtime glue (api, auth, mount, motion)
│   │   └── src/
│   │       ├── api/                       # unchanged
│   │       ├── auth/                      # unchanged
│   │       ├── components/motion/         # unchanged
│   │       ├── shadow-dom/                # unchanged
│   │       ├── styles/base.css            # shadow-DOM reset; token block regenerated from registry
│   │       ├── stories/                   # unchanged
│   │       └── lib/, utils/               # unchanged
│   │   # DELETED: src/components/ui/ (wrappers), src/components/ui/perimeter/ (synced copy)
│   │   # DELETED: scripts/sync-components.mjs, sync-tokens.mjs, post-sync.mjs
│   └── vite-preset/
│
├── widgets/
│   └── sermons/                           # renamed from packages/widget-sermons
│
├── dist/<widget>/<widget>.js              # IIFE builds, jsDelivr-served, unchanged
├── docs/
├── turbo.json
├── pnpm-workspace.yaml                    # apps/*, packages/*, widgets/*
└── package.json
```

**Retired:**
- `packages/storyboard/` — functionality moves into `apps/site/src/app/widgets/`.
- `packages/shared/scripts/sync-*.mjs` — no external sync once the registry is local.
- `packages/shared/src/components/ui/**` — wrapper duplicates and synced copies.
- `style/` repo — archived after Phase 6 cutover.

## `packages/registry/` as the Single Source of Truth

The registry package has two jobs, served from the same files:

**Job 1 — be consumed by workspace packages.** It exports a normal TypeScript API:

```ts
// packages/registry/src/index.ts
export { Button, buttonVariants } from "../ui/perimeter/button";
export { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../ui/perimeter/card";
// ... etc. for all 38 components
```

Widgets and the site import these directly:

```ts
import { Button } from "@perimeter-widgets/registry";
```

**Job 2 — be built by `shadcn build` for external consumers.** Running `shadcn build` inside `packages/registry/` reads `registry.json` + `ui/perimeter/*.tsx` and emits `/r/<component>.json` files. Those files are copied into `apps/site/public/r/` during the site's build so they ship with the Next.js static export at `style.perimeter.org/r/*.json`. External install commands do not change.

**Import paths inside registry source.** Registry components today use `@/lib/utils` and `@/components/ui/button`. The shadcn CLI rewrites these at install time for external consumers, so the on-disk form must keep `@/` aliases. Inside the monorepo, `packages/registry/tsconfig.json` defines `paths` so TypeScript resolves `@/` → `./ui/perimeter/` locally. This lets the same files both ship through shadcn CLI (external) and be importable as a workspace package (internal).

**Themes.** `packages/registry/themes/*.json` is the canonical source. A single script (`generate-theme-css.ts`) regenerates the token block in:
- `apps/site/src/app/globals.css` (same markers style uses today: `@generated-themes-start` / `@generated-themes-end`)
- `packages/shared/src/styles/base.css` (same markers sync-tokens uses today: `@sync:tokens-start` / `@sync:tokens-end`)

No more `fetch('https://style.perimeter.org/...')`. Both files regenerate from local JSON.

**Wrapper deletion.** `packages/shared/src/components/ui/{button,dialog,input,textarea,input-group}.tsx` are near-verbatim copies of registry sources. Differences (verified via diff): prettier formatting (single vs double quotes, 4 vs 2 indent), relative vs `@/` imports, and a minor `container` prop drift in `dialog.tsx` now covered by the recent portal-prop work. These wrappers exist only because the shadcn CLI's import rewriting forced them into `shared`. After the merge, widgets import registry components directly; the wrappers are deleted.

## Site App Feature Parity and New Surfaces

### Ported unchanged from style (Phase 1)

- Root layout, `globals.css` (with tokens regenerated from `packages/registry/themes/`)
- `src/components/site/` — top nav, sidebar, search, playground, code-block, Shiki server + client highlighters
- `src/lib/{demo-types,highlight,highlight-client,extract-source}.ts`
- Demo collection (`scripts/collect-demos.ts` → `demo-manifest.json` + `demo-imports.ts`), adapted to point at `packages/registry/ui/perimeter/*.demo.tsx`
- Routes: `/components`, `/components/[category]`, `/components/[category]/[slug]`, `/templates`, `/templates/[slug]`, `/docs`, `/changelog`
- `generate-sitemap.ts`, `next.config.ts` (static export), webpack dev (Turbopack hangs on 38 dynamic demo imports)
- Theme list discovery (`readdirSync` on `packages/registry/themes/`), `data-theme` + `.dark` runtime switching

### New — `/widgets` section (subsumes storyboard, Phase 4)

- `/widgets` — list of widgets with metadata and status (ready/skeleton/planned). Registry moves from `packages/storyboard/src/registry.ts` to `apps/site/src/lib/widgets-registry.ts`.
- `/widgets/[slug]` — renders the widget inside a shadow-DOM preview, live config editor for `data-*` attributes (instant re-mount on change), auto-generated embed-code snippet. `WidgetPreview.tsx` + `ConfigEditor.tsx` + `ThemeToggle.tsx` + `DataSourceToggle.tsx` port to Next.js client components.
- MSW mocks move to `apps/site/src/mocks/`; the `VITE_API_MODE=local` toggle becomes `NEXT_PUBLIC_API_MODE=mock|local` registered client-side only.
- Widget dev loop: the site imports widget React entries directly via workspace alias (same pattern storyboard uses today) — previews hot-reload without an IIFE build.

### New — `/design` multi-page section (Phase 5)

- `/design` — landing page linking to each sub-page.
- `/design/colors` — theme tokens grouped by role (surface, text, primary, feedback, chart, sidebar); swatch + OKLCH + hex for light and dark modes; sourced from `packages/registry/themes/default.json`.
- `/design/typography` — font families, weights, type scale, line-height, tracking; rendered samples at each size.
- `/design/spacing` — spacing scale (Tailwind default + project overrides); visual spacers at each step.
- `/design/borders` — radius scale (`--radius-sm` through `--radius-4xl`), border widths, shadow steps, rings, outlines.
- `/design/branding` — logo marks (primary, white, mono), brand colors distinct from UI tokens, usage guidelines, downloadable assets from `apps/site/public/brand/`.

Data sources for design pages: colors from `packages/registry/themes/default.json` directly; typography/spacing/radius from `apps/site/src/app/globals.css`. Token extraction can stay in CSS initially; if the design pages need programmatic access to the full scale, we extract to `packages/registry/tokens.json` in a later iteration.

The old `/tokens` route redirects to `/design/colors`.

## Build Pipeline

Turborepo tasks and dependencies:

| Package | Task | Depends on |
| --- | --- | --- |
| `packages/registry` | `build` | — (runs `shadcn build`, emits `dist/r/*.json`) |
| `packages/shared` | `build` | `^build` (registry) |
| `widgets/sermons` | `build` | `^build` (shared → registry) |
| `apps/site` | `build` | `^build` (consumes registry, copies `dist/r/*.json` into `public/r/`) |

`apps/site` build script chain (replaces style's current chain):

```
pnpm build (in apps/site)
  1. pnpm --filter @perimeter-widgets/registry build       # shadcn build → packages/registry/dist/r/
  2. tsx scripts/copy-registry-output.ts                    # → apps/site/public/r/
  3. tsx scripts/generate-theme-css.ts                      # inject tokens into apps/site/src/app/globals.css
  4. tsx scripts/collect-demos.ts                           # scan packages/registry/ui/perimeter/*.demo.tsx
  5. tsx scripts/generate-sitemap.ts
  6. next build
```

**Dev loop.** Root `pnpm dev` → `turbo dev --filter=@perimeter-widgets/site`. Site runs `next dev --webpack` (Turbopack still hangs on demo dynamic imports). Editing a registry component file or widget source triggers Next's webpack dev server recompile; widget sources are imported directly via workspace alias in dev, bypassing the IIFE build.

**Quality.** Root `pnpm quality` → `turbo typecheck lint test && prettier --check .`. `./quality.sh` in the parent `claude/` workspace continues to work (the perimeter-widgets project still reports pass/fail; style drops off the table after cutover).

**Widget output.** `widgets/sermons/vite.config.ts` continues to emit to the monorepo-root `dist/sermons/sermons.js` — the path jsDelivr serves and WordPress embeds reference. The directory rename from `packages/widget-sermons/` to `widgets/sermons/` does not change the dist path.

**CI.** `.github/workflows/*` in perimeter-widgets add typecheck + lint + build for `apps/site`. The `style/` repo's Vercel deploy action is disabled at Phase 6 cutover.

## Phased Rollout

Each phase is a feature branch off `dev` → PR to `dev`. `dev` stays deployable throughout. Old `style.perimeter.org` continues to serve from the standalone `style/` repo until Phase 6.

### Phase 1 — `feat/registry-package-subtree`

- `git remote add style-upstream https://github.com/perimeterchurch/style.git`
- `git fetch style-upstream`
- `git subtree add --prefix=.style-staging style-upstream/dev` (stages style's full tree + history at a temp path)
- Within the same branch, split the staged tree across its final homes via `git mv`:
  - `.style-staging/registry/` → `packages/registry/` (ui + themes + lib + registry.json)
  - `.style-staging/src/` → `apps/site/src/`
  - `.style-staging/scripts/` → `apps/site/scripts/`
  - `.style-staging/public/` → `apps/site/public/`
  - `.style-staging/next.config.ts`, `tsconfig.json`, `components.json`, `postcss.config.mjs` → `apps/site/`
  - `.style-staging/CHANGELOG.md` → merge into `apps/site/CHANGELOG.md`
  - Drop `.style-staging` when empty
- Add `packages/registry/package.json` (`@perimeter-widgets/registry`) with a minimal `src/index.ts` that re-exports all components. Add `packages/registry/tsconfig.json` with `paths: { "@/*": ["./ui/perimeter/*"] }`.
- Add `apps/site/package.json` (`@perimeter-widgets/site`); update its `collect:demos` + `generate:themes` scripts to point at `packages/registry/`.
- Update `pnpm-workspace.yaml` to add `apps/*` and `widgets/*` globs.
- Update root `turbo.json` with site and registry task graphs.
- **Verification:** `pnpm -w install` resolves; `pnpm --filter @perimeter-widgets/site build` produces a working static export serving `/r/*.json`; `pnpm --filter @perimeter-widgets/site dev` runs the showcase; `git log --follow packages/registry/ui/perimeter/button.tsx` reaches back into style's history.
- Storyboard is not retired in this phase; site runs alongside it. `style.perimeter.org` still served from old `style/`.

### Phase 2 — `refactor/shared-imports-from-registry`

- In `packages/shared/`: replace every `import ... from './components/ui/perimeter/<name>'` with `from '@perimeter-widgets/registry'`.
- Delete `packages/shared/src/components/ui/{button,dialog,input,textarea,input-group}.tsx` (wrapper duplicates) and the entire `packages/shared/src/components/ui/perimeter/` directory.
- Delete `packages/shared/scripts/{sync-components,sync-tokens,post-sync}.mjs` and the root `sync:style` / `sync:tokens` scripts.
- Have `apps/site/scripts/generate-theme-css.ts` also update `packages/shared/src/styles/base.css` between its existing `@sync:tokens-start` / `@sync:tokens-end` markers (keep the markers so the diff stays scoped).
- **Verification:** `pnpm quality` passes; `pnpm --filter widget-sermons build` produces a working IIFE with identical visual output; storyboard still runs against the updated shared package.

### Phase 3 — `chore/widgets-directory-rename`

- `git mv packages/widget-sermons widgets/sermons`.
- Rename package: pick one of `@perimeter-widgets/sermons` (shorter) or keep `@perimeter-widgets/widget-sermons` (no consumer changes). Decide during the phase; both work. **Recommended:** keep the existing package name to avoid touching imports in shared, storyboard, and the site.
- Update `pnpm-workspace.yaml` (keep `widgets/*` glob added in Phase 1), turbo filters, any docs or sermons-registry entries that reference `packages/widget-sermons`.
- Verify `dist/sermons/sermons.js` path is unchanged (the Vite config emits to monorepo-root `dist/<widget>/<widget>.js`).
- **Verification:** `pnpm -w install`; `pnpm --filter @perimeter-widgets/widget-sermons build` (or the new name) emits to the same `dist/sermons/sermons.js`; WordPress embed URLs keep working.

### Phase 4 — `feat/site-subsumes-storyboard`

- Port `packages/storyboard/src/{App,registry,components/*,mocks,previews,styles}` into `apps/site/src/app/widgets/` as Next.js pages and client components.
- `ConfigEditor`, `WidgetPreview`, `ThemeToggle`, `DataSourceToggle` become site components under `apps/site/src/components/widgets/`.
- MSW handlers move to `apps/site/src/mocks/`; register client-side only (gated on `NEXT_PUBLIC_API_MODE=mock`).
- Embed code generator moves to `apps/site/src/lib/embed-code.ts`.
- Delete `packages/storyboard/` entirely; remove from `pnpm-workspace.yaml` and `turbo.json`.
- Update root `pnpm dev` → `turbo dev --filter=@perimeter-widgets/site`.
- Update `env.d.ts` at root: remove `VITE_API_MODE`; add `NEXT_PUBLIC_API_MODE` doc.
- **Verification:** `/widgets` page lists sermons; `/widgets/sermons` shows the widget in a shadow-DOM preview; config editor updates data-attrs and re-mounts; embed code snippet generates correctly; both mock and local API modes work.

### Phase 5 — `feat/design-system-pages`

- Add `apps/site/src/app/design/{page,colors,typography,spacing,borders,branding}/page.tsx`.
- Extend site nav to include `/design` with sub-entries.
- Data: colors from `packages/registry/themes/default.json`; typography/spacing/radius from CSS; branding from `apps/site/public/brand/` (add placeholder assets for now — real brand marks filed in a follow-up).
- Remove the old `/tokens` route; add a redirect in `next.config.ts` from `/tokens` → `/design/colors`.
- Update `CHANGELOG.md` with design-system page additions.
- **Verification:** all design sub-pages render; theme switcher updates swatches on `/design/colors` live; all internal links work; Shiki code blocks render on any pages that include them.

### Phase 6 — `chore/style-cutover`

- In Vercel: repoint `style.perimeter.org` from the `style/` repo to `perimeter-widgets` with:
  - Root directory: `apps/site`
  - Install command: `pnpm -w install` (run from monorepo root)
  - Build command: `pnpm --filter @perimeter-widgets/site build`
  - Output directory: `apps/site/out` (Next.js static export)
- Smoke-test the deployment: load the showcase, test theme switcher, open `/r/button.json` directly, run `pnpm dlx shadcn@latest add @perimeter/button` from a scratch directory.
- Confirm `metrics/`, `perimeter-api/`, and `widgets/sermons/` still build against the new deployment.
- Archive the standalone `style/` GitHub repo (read-only on GitHub); remove the `style/` directory from the parent `claude/` workspace.
- Update parent `claude/CLAUDE.md` project table: remove `style/`, update `perimeter-widgets/` description to reflect merged showcase + registry + design system.
- Update `perimeter-widgets/CLAUDE.md` with the new app/package/widget layout, the retired storyboard, and the design-system pages.
- **Verification:** `style.perimeter.org` serves the merged site; `/r/*.json` serves registry JSON; scratch install of `@perimeter/button` succeeds; all three consumer projects build.

## Non-Goals

- **No registry URL change.** External consumers see zero changes to install commands or JSON shapes.
- **No widget runtime changes.** IIFE builds, shadow DOM mounting, auth, and embed snippets are untouched except for the sermons directory rename.
- **No framework migration.** Site stays Next.js 16 with webpack dev and static export, exactly as style runs today.
- **No component API changes.** Phase 1–6 do not change any component's public API; we're relocating code, not rewriting it. API changes are a separate follow-up if needed.
- **No new widgets or new components.** Feature additions land in follow-up work after the merge is complete.
- **No design-system token extraction.** `/design/*` pages read from existing CSS + theme JSON. Extracting full tokens into `packages/registry/tokens.json` is a potential follow-up if the pages need it.

## Risks and Mitigations

- **Subtree merge conflicts on first commit.** Mitigation: `.style-staging` prefix isolates the import from all existing paths; `git mv` is used for relocation so history follows. Phase 1 explicitly tests that `git log --follow` works before merging the PR.
- **Demo collection breakage.** Style's demo collector uses regex extraction from `.demo.tsx` files; any path-rewrite mistake breaks the manifest. Mitigation: run `collect:demos` inside the new site during Phase 1 and verify all 38 demos resolve before opening the PR.
- **Theme regeneration drift.** `generate-theme-css.ts` updates two files now (site globals + shared base.css). A divergence bug there would cause widget visuals to drift. Mitigation: assert equality between regenerated blocks across both files in a script-level check; CI fails if markers or counts differ.
- **Vercel cutover downtime.** Repointing the domain is an atomic DNS-level change in Vercel. Mitigation: keep the old `style/` Vercel project enabled until after the new deploy verifies; switch the domain last. Roll back by re-enabling the old project.
- **External consumer breakage during cutover.** Any JSON shape or path difference between the old build and the new build breaks `shadcn add`. Mitigation: Phase 6 includes an explicit diff of `/r/*.json` outputs between the old deployment and the new deployment before cutover.
- **Storyboard retirement before `/widgets` parity.** If Phase 4 ships incomplete features, internal widget dev regresses. Mitigation: ship Phase 4 only when every storyboard capability (config editor, embed code, MSW toggle, theme toggle, data-source toggle) is present on `/widgets/[slug]`; storyboard stays live in Phases 1–3.

## Testing

- **Phase 1:** site builds, `/r/*.json` is present in `out/`, demos render, `git log --follow` reaches style history.
- **Phase 2:** `pnpm quality` passes; sermons IIFE build output is byte-compared (or visually compared) against pre-Phase-2 output.
- **Phase 3:** IIFE dist path unchanged; install resolves; site + storyboard + sermons all build.
- **Phase 4:** `/widgets/sermons` functional parity checklist against storyboard features; MSW + local API mode both work.
- **Phase 5:** design sub-pages render; theme switching updates swatches; no console errors.
- **Phase 6:** post-cutover smoke test (showcase loads, registry JSON serves, scratch install works, all consumer projects build).

## Open Questions

- Should the design-page data (typography scale, spacing scale) be lifted into `packages/registry/tokens.json` now, or stay in CSS until a real use case demands extraction? **Default:** stay in CSS; extract later if needed.
- Do we want to rename `@perimeter-widgets/widget-sermons` to `@perimeter-widgets/sermons` during Phase 3, or keep the package name and only rename the directory? **Default:** keep the package name to minimize churn; directory rename is sufficient for the user's stated preference.
- Should the merged CLAUDE.md in `perimeter-widgets/` be restructured (separate site/registry/widgets sections) or just amended? **Default:** amend in Phase 6; a full restructure can be a follow-up if the doc grows unwieldy.
