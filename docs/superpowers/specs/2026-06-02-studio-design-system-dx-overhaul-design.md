# Studio, Design System & DX Overhaul — Design

**Date:** 2026-06-02
**Status:** Approved design, pre-planning
**Builds on:** the streamline rebuild (spec `2026-05-29-perimeter-widgets-streamline-redesign-design.md`), which is live in production. `dev` is ahead of `main` by studio fixes #72–#76; they ride along with this effort (no separate release first).

## Problem

The streamline rebuild shipped a working platform, but three gaps remain:

1. **Dev/prod rendering is not 1:1.** Widgets render through the real `mount()`, but the dev-server CSS pipeline differs from the shipped bundle's, UI components preview in the studio's light DOM with the studio's own Tailwind build (a completely different style pipeline), and nothing simulates the host page a widget actually lands on.
2. **The studio is barebones.** Three plain columns, unstyled text buttons. There is no design-system reference (tokens, component usage, guidelines) anywhere — the old showcase site was deleted in the streamline.
3. **Building a widget end-to-end is undocumented for Claude.** A new widget needs MP schema discovery, often a new perimeter-api endpoint, regenerated API types, styling with the design system, and a release — that path exists only as tribal knowledge spread across two repos. Several docs are stale (pre-streamline `adding-a-widget.md` / `vite-preset.md`, the root workspace CLAUDE.md still describes the deleted showcase site, `sermons.md` has a dead campus section). Releasing requires hand-editing versions and manual PR mechanics.

## Goal

What you see in the studio is what the production site gets; the studio is a polished dev tool **and** the team's deployed design-system site; Claude (or a developer) can take a widget from idea → MP data → API endpoint → styled widget → production version bump by following one documented, tooled path.

## Locked decisions (user-chosen)

- **Parity: audit first, decide after.** Phase 1 produces a findings report; the user sets the fix bar for Phase 2 from it.
- **Studio ambition: polished dev tool + full design-system site** (tokens, component usage docs, widget-building/styling guidelines).
- **One Vite app, two faces** (Approach A): `studio/` is both the dev harness and the deployed read-only design-system site. No second app — the two-app split (`apps/studio` + `apps/site`) is what the streamline killed; do not reintroduce it.
- **Deploy to style.perimeter.org** as a standalone static Vercel project (same pattern as `widgets-cdn`).
- **Claude flow: skill + docs + scaffolder** (`pnpm create-widget <name>`).
- **Release DX: one-command release** — `pnpm release <name> --patch|--minor|--major` bumps, builds, commits on a release branch, pushes, opens the PR to dev. The batched `dev → main` release-PR flow is unchanged.
- **#72–#76 ride along** with this effort's release; no standalone release first.

## Architecture

### One studio, two faces

`studio/` remains the single Vite app:

- **Routing:** `react-router` (SPA). Routes: `/` (overview), `/widgets/:slug`, `/components/:name`, `/tokens`, `/guides/:slug`. Deployed as a static build with an SPA-fallback rewrite on Vercel.
- **Mode seam, minimal:** everything that works statically ships in the deployed site — widget previews via the real `mount()` against the production API, config panel, theme editor, docs, embed snippets. Only features requiring local files are gated behind `import.meta.env.DEV` (e.g. built-bundle preview reading `widgets/*/dist`). The deployed site is read-only by nature (static build, no mutations).
- **Docs single-sourced as MDX:** component usage, token reference, and guides live as `.mdx` files under `docs/` (repo root), discovered with `import.meta.glob` and compiled with `@mdx-js/rollup`. The same files Claude reads as markdown render as site pages with live component examples. One source of truth for humans and Claude. (Glob gotcha applies: patterns are relative to the importing file, `../../../` style — never `/…`.)
- **Component previews move into the widget pipeline:** a `ComponentStage` mounts examples inside a shadow root using the same `styling` module from `@perimeter/widget-runtime`, fed CSS compiled through the same Tailwind preset + rem→px chain a widget ships with. This kills the light-DOM/studio-Tailwind divergence. The studio *chrome* (sidebar, panels) keeps its own styling — only the preview canvas needs parity.

## Phase 1 — Parity audit

Trace every stage where dev rendering can diverge from a production WordPress page:

1. **CSS pipeline:** dev-served `styles.css?inline` (studio's PostCSS) vs `widgetConfig()` build output (rem→px, Tailwind content, minification). Automated check: compile both pipelines per widget and diff normalized output. This check becomes a permanent regression test.
2. **Runtime:** React dev vs production build, `NODE_ENV`, `:root`→`:host` rewrite, `adoptedStyleSheets` vs `<style>` fallback.
3. **Host environment:** shadow DOM inherits inheritable properties (`font-family`, `color`, `line-height`) from the host page — the WordPress page's fonts vs the studio canvas. Classic "looks different on the real site" source; quantify it and propose the canvas host-page-sim design from findings.
4. **Components path:** quantify the light-DOM ComponentPreview divergence (already identified qualitatively).
5. **Config/data:** `data-*` coercion, API base URL handling, auth seam dev vs prod.
6. **Visual verification:** build `example` + `sermons`, load through the real `cdn/loader.js` on a WordPress-like fixture page, screenshot-compare against the studio render (Playwright). The fixture's provenance (hand-authored vs derived from the real perimeter.org page styles) is pinned in the Phase 1 plan, and the same fixture becomes the single source of truth for the canvas host-page-sim background — the audit must not measure against a divergent stand-in.

**Deliverable:** a findings report — per divergence: stage → dev vs prod behavior → user-visible impact → proposed fix → effort. **User review gate:** the user sets the Phase 2 fix bar from this report.

## Phases 2–3 — Studio UI + design-system site

### Layout (built from `@perimeter/ui` — the studio dogfoods the design system)

- **Sidebar:** search/filter; nav grouped into Widgets / Components / Tokens / Guides; active state; collapses on small screens.
- **Canvas:** preview stage with a toolbar — viewport-width presets (375 / 768 / 1280 / fluid + draggable custom width), background toggle (white / gray / dark / host-page sim per audit findings), and a dev-only **source ⇄ built-bundle** toggle that mounts the actual `widgets/<name>/dist/index.js` IIFE for a final pre-release check. Errors render in a styled boundary with the stack.
- **Inspector:** tabs — *Config* (the `data-*` panel; generated embed snippet with copy button, live-updating as config changes), *Theme* (token editor with reset), *Info* (version, last-build bundle size, schema reference).

### Pages

- **`/widgets/:slug`:** preview + the widget's MDX doc if present (`docs/widgets/<slug>.mdx`) — purpose, config reference generated from the zod schema, embed instructions.
- **`/components/:name`:** per-component MDX doc rendering live examples through the shadow-DOM `ComponentStage`; props/usage/do-and-don't alongside. Components without a doc fall back to the auto-gallery (inside the stage, so still parity-correct) — docs can land incrementally across the existing `@perimeter/ui` components (the list is always derived from discovery, never hard-coded).
- **`/tokens`:** full `@perimeter/theme` reference rendered live — color swatches, radii/spacing/type scale, each with CSS variable name and default, plus per-embed override guidance.
- **`/guides/*`:** the MDX guides that are also the Claude-facing docs (styling a widget, building a widget end-to-end, data/API patterns, testing, releasing).

### Deployment

style.perimeter.org as a standalone static Vercel project. Pin static config in the studio's `vercel.json` the way `cdn/vercel.json` does (the `widgets-cdn` root-directory/no-monorepo-build gotchas apply identically). Note from the `widgets-cdn` setup: Root Directory and "Include files outside the Root Directory" are dashboard-only settings, not expressible in `vercel.json` — the Phase 3 plan must call out which steps are dashboard-only rather than assuming full scriptability. DNS is owner-driven.

## Phase 4 — DX tooling

### `pnpm create-widget <name>`

A `create` command in the existing `@perimeter/release` package (it is already the dev-only tooling home; no new package):

- Scaffolds `widgets/<name>/` from a template: `widget.tsx` (defineWidget + zod schema with `z.coerce` reminders), `app.tsx`, `entry.ts`, `styles.css`, `env.d.ts`, `package.json` at `0.0.0`, `vite.config.ts` (`widgetConfig({ name })`), `tsconfig`, starter `tests/` (render guard + bundle budget), and a stub `docs/widgets/<name>.mdx`.
- Validates the name (kebab-case, not taken), runs `pnpm install`, prints next steps. The workspace glob already covers `widgets/*` — no manifest edits. The scaffold's `pnpm install` updates the lockfile; the scaffolder reminds the user to commit it so the release command's clean-working-tree guard isn't tripped later.
- Template is real files in `packages/release/templates/widget/` with `__NAME__` substitution — boring and testable (CI scaffolds into a temp dir and builds it).

### `pnpm release <name> --patch|--minor|--major`

Extends the existing release CLI:

- Bumps `widgets/<name>/package.json` itself, then the existing flow: build → immutable `cdn/<name>/<version>/` → manifest + rewrites → prune to 5.
- New: commits on a fresh `release/<name>-<version>` branch off `dev`, pushes, opens the PR to dev via `gh pr create --body-file` (never inline `--body`) with a generated body (version, size, changed files). Guards: clean working tree, up to date with `origin/dev`, version not already in `cdn/`.
- Bare `pnpm release <name>` (current behavior: version as-is, commit only, no push/PR) is preserved.
- `dev → main` remains the batched release-PR flow.

## Phase 5 — Docs audit + Claude skill

### Audit/prune

- Root workspace CLAUDE.md: remove the deleted showcase-site/56-component-registry description; describe the current shape.
- Widgets CLAUDE.md: restructure as a lean index (commands, rules, doc pointers); phase-by-phase history moves to the handoff doc.
- Delete superseded docs (`docs/guides/adding-a-widget.md`, `docs/architecture/vite-preset.md`, and any other pre-streamline leftovers superseded by the MDX guides); fix `docs/widgets/sermons.md` (stale campus section). Old superpowers plans/specs stay — they are history.

### The skill

`perimeter-widgets/.claude/skills/creating-a-widget.md` (auto-discovered from the parent workspace, like mp-explorer's). A thin orchestrator that sequences and links the MDX guides — it does not duplicate them:

1. **Data discovery:** which MP tables/columns back the widget — via mp-explorer, with the exact flag gotchas baked in (positional table name, `--top`, `--filter`; unknown flags silently ignored).
2. **API endpoint:** check whether perimeter-api already exposes the data. If not — the cross-repo step: read perimeter-api's CLAUDE.md, follow its domain/endpoint patterns, verify MP columns against the live schema (existing skill), then regenerate `@perimeter/api-hooks` OpenAPI types (the regen command gets documented as part of this phase).
3. **Scaffold:** `pnpm create-widget`, dev loop in the studio.
4. **Style:** tokens-first, `@perimeter/ui` components, the styling guide.
5. **Test + quality gate:** `pnpm format` then `pnpm quality`, with the turbo-cache `--force` gotcha.
6. **Release:** `pnpm release --patch`, PR etiquette, how production updates flow.

## Testing

- The CSS pipeline-diff parity check (Phase 1) becomes a permanent regression test.
- Studio render guards (happy-dom) extend to the router, pages, and `ComponentStage` — studio runtime bugs are invisible to typecheck/build (three reached the browser before the guard existed).
- Scaffolder CI test: scaffold into a temp dir, build it.
- Release-CLI dry-run tests for the bump/branch/PR logic.
- Existing per-widget bundle budgets unchanged (sermons 900 KiB gz).

## Rollout

Five phases, each its own plan → workflow/multi-agent execution (user preference) → feature-branch PR into `dev`. Never commit to `dev`/`main`; `--body-file` for all PR bodies. The one-time style.perimeter.org Vercel project setup is driven via the Vercel tooling with the static-config gotchas pinned in `vercel.json`; DNS stays owner-driven. `dev → main` releases stay batched and user-initiated.

## Out of scope

- Self-hosting the pdf.js worker / sermons bundle-size follow-ups (tracked separately).
- The WordPress cutover for sermons (owner-driven, Phase 4 runbook of the streamline effort).
- Shared-React import maps, postMessage auth upgrade (deferred in the streamline spec; unchanged here).
