# Perimeter Widgets — Session Handoff (2026-06-02)

Pick-up document for the **streamline redesign** effort. Read this first, then the spec/plans linked below.

## TL;DR

The streamline rebuild is **complete and live in production**. `widgets.perimeter.org` serves `sermons@1.0.1` (and `example@0.0.0`). `main` is production; `dev` is ahead by four **studio dev-experience fixes (#72–#75)** that have **no production impact** — release them to `main` whenever convenient. The only substantive work left is the **owner-driven WordPress cutover** (add the embed to the site) plus a few tracked, optional follow-ups.

## What this project is

A from-the-studs redesign of `perimeter-widgets` to remove the complexity of the previous build. Goal: a streamlined widget + UI-component development experience with live HMR, dev-matches-prod rendering, simple hosting/versioning, and an easy on-ramp for the team (and Claude).

- **Design spec:** `docs/superpowers/specs/2026-05-29-perimeter-widgets-streamline-redesign-design.md`
- **Phase plans:** `docs/superpowers/plans/2026-05-29-…phase-1-foundation.md`, `…phase-2-sermons-port.md`, `…phase-3-hosting-release.md`, `docs/superpowers/plans/2026-06-01-…phase-4-cutover.md`

## Architecture (as shipped)

pnpm + Turborepo monorepo.

- **Packages:** `theme` (px design tokens, Tailwind preset, `resolveTokens`, `rewriteRootToHost`), `widget-runtime` (`defineWidget`, `mount`, `autoMount`, shadow `styling` module, providers, `useAuth`/`useApiClient`), `vite-plugin-widget` (`widgetConfig()` build helper), `auth` (`AuthProvider` + `MPLocalStorageAuth`), `api-client`, `api-hooks` (React Query hooks + generated OpenAPI types), `ui` (shadcn-style components), `release` (`pnpm release` CLI).
- **Apps/dirs:** `studio/` (Vite dev harness **and** the deployable read-only gallery), `cdn/` (plain static dir = the production CDN), `widgets/{example,sermons}`.
- **Single mount path:** `mount(host, definition, css, extras)` is used identically by the production IIFE (`autoMount(widget, css)` in each widget's `src/entry.ts`) and by the studio (`WidgetPreview`). CSS is imported as a `?inline` string and injected into the shadow root via a shared `CSSStyleSheet` (`adoptedStyleSheets`, with a `<style>` fallback); px token scale; `:root`→`:host` rewrite. **This is the core of the redesign — there is no dual render path.**
- **Build:** each widget = `defineConfig(widgetConfig({ name }))` → a single self-contained IIFE at `widgets/<name>/dist/index.js` (rem→px, NODE_ENV=production, `"use client"`/sourcemap warnings filtered).
- **Auth:** `AuthProvider` seam; default `MPLocalStorageAuth` reads `mpp-widgets_AuthToken` from `localStorage` (the WordPress contract). Public + authenticated widgets both supported.

## Production & hosting

- **CDN:** `cdn/` deployed as a **standalone Vercel static project** (`widgets-cdn`, team *Perimeter Church*) at **`widgets.perimeter.org`**. Immutable `cdn/<name>/<version>/index.js` (+ `.map`, cached 1yr) + `cdn/manifest.json` (the mutable pointer) + `cdn/vercel.json` (cache/CORS headers, `/<name>/latest.js` rewrite, **pinned static-no-build config**) + `cdn/loader.js`.
- **Release flow:** `pnpm release <name>` builds the widget, copies the immutable bundle into `cdn/`, updates `manifest.json` + the `latest.js` rewrite, prunes to the last 5 versions, and commits. Then PR → `dev`, then a batched **`dev → main` release PR**; Vercel auto-deploys `main`. **Promote** = the manifest change. **Rollback** = revert the commit or Vercel Instant Rollback.
- **Embed (production):**
  ```html
  <div data-perimeter-widget="sermons"></div>
  <script src="https://widgets.perimeter.org/sermons/latest.js" async></script>
  ```
  Config via real schema attributes: `data-per-page`, `data-default-view` (grid|list|large), `data-default-tab` (sermons|series), `data-series-id`, `data-display`, `data-api-url`. (No `data-limit`/`data-initial-view`/`data-campus`.)
- **Docs:** `docs/deploying.md` (step-by-step deploy + the real Vercel gotchas), `docs/hosting-and-release.md` (canonical hosting model), `docs/creating-a-widget.md` (new-widget on-ramp).

## Status of each phase

| Phase | Status |
| --- | --- |
| 1 — Foundation (platform + Vite studio) | ✅ merged (#62) |
| 2 — Sermons port | ✅ merged (#63) |
| 3 — Hosting + release (`cdn/`, `pnpm release`) | ✅ merged (#64) |
| 4 — Cutover runbook + jsDelivr-doc retirement | ✅ repo-side merged (#65); **WordPress embed is owner-driven, not done** |
| Production launch | ✅ `widgets.perimeter.org` live, `sermons@1.0.1` |
| Studio dev-experience fixes | ✅ merged to `dev` (#72–#75), **not yet released to `main`** |

## What's left (next session)

1. **Release `dev → main`** for the studio fixes #72–#75 (discovery globs, css crash, render hardening, Tailwind content). No production/bundle impact — just gets `main`/team checkouts a working studio. Use the `open-release-pr` flow.
2. **WordPress cutover (owner-driven)** — runbook: `docs/superpowers/plans/2026-06-01-…phase-4-cutover.md`. It's a **first launch** (jsDelivr/legacy is already retired, nothing live to flip):
   - Gate C: smoke-test the embed on a **private** WordPress page (desktop+mobile, grid/list, series→sermon, filters + bookmarkable URL, a PDF, audio/video, no console errors).
   - Gate D: add the embed to the public page.
   - Gate E: monitor ~1 week via the `widgets-cdn` Vercel logs.
   - Gate F: nothing — `legacy/v1` is already deleted.
3. **Tracked follow-ups (optional, out of scope so far):**
   - Self-host the pdf.js worker to shrink the sermons bundle (~858 KiB gz → ~500–600 KiB). Currently inlined via `?raw`.
   - Investigate the ~58 KiB size regression vs the old platform (sermons 801 → ~859 KiB gz). Budget is **900 KiB** (enforced in `widgets/sermons/tests/bundle.test.ts`).
   - Broader docs audit: `docs/guides/adding-a-widget.md` + `docs/architecture/vite-preset.md` still describe pre-streamline scaffolding; `docs/widgets/sermons.md` has a stale "Campus ID Mapping" section.

## How to work in it

- **Run the studio (primary dev loop):** `pnpm --filter @perimeter/studio dev` → http://localhost:5173. Lists all widgets + UI components (auto-discovered), previews through the real `mount()`, HMR, live config (`data-*`) + theme-token editing. (`pnpm dev` also runs the per-widget `vite build --watch`; not needed for studio HMR.)
- **New widget:** copy `widgets/example`, edit `src/widget.tsx` (name/schema/App), add it to `pnpm-workspace.yaml`, `pnpm dev`. See `docs/creating-a-widget.md`.
- **Quality gate (run from root):** `pnpm format` then `pnpm quality` (typecheck + lint + test + format check). Required before any PR.
- **Release a widget:** bump `widgets/<name>/package.json` version → `pnpm release <name>` → PR.
- **Branch rules:** never commit to `dev`/`main`; feature branch → PR into `dev`; `main` only via batched `dev → main` release PR. Use `--body-file` for `gh pr` bodies (never inline).

## Gotchas & lessons learned (read before changing things)

- **Turbo cache masks tests:** a green local `pnpm quality` can be a cache *replay* (tests didn't run). Verify CI-bound changes with `pnpm exec turbo run test --filter=<pkg> --force`; treat CI as the source of truth.
- **Commits pushed after a PR merged are stranded** (they never reach `dev`). Open a **new** PR for follow-ups; verify with `git log origin/dev..origin/<branch>`. (This bit us twice — `deploying.md` and the `1.0.1` release.)
- **Vercel CDN config:** the `widgets-cdn` project's **Root Directory must be `cdn`** (not `apps/cdn`, not blank) and **"Include files outside the Root Directory" must be OFF** — otherwise Vercel runs the monorepo Turbo build and fails with `No Output Directory named "public"`. The static-no-build behavior is also pinned in `cdn/vercel.json` (`framework: null`, empty `buildCommand`/`installCommand`, `outputDirectory: "."`).
- **Studio runtime bugs are invisible to typecheck/build** — three reached the browser before a happy-dom render guard was added (`studio/src/components/render.test.tsx`). When touching the studio, exercise the render path. Specific fixed gotchas: `import.meta.glob` patterns are relative to the Vite root (`studio/`), so use `../../../` for repo root; the css glob must **not** use `import: 'default'` (returns a bare string, breaks `c.default`); `studio/tailwind.config.ts` must use the `@perimeter/theme` preset **and** scan `../widgets/*/src` + `../packages/ui/src` or everything renders unstyled; `ComponentPreview` wraps each component in an error boundary (prop-requiring components throw when rendered bare).
- **Widget `data-*` config:** numeric fields need `z.coerce.number()` (everything arrives as a string; `perPage` was `z.number()` and crashed on `data-per-page`). Booleans are pre-converted by the runtime (`"true"`/`"false"`).

## PR history (this effort)

#62 foundation · #63 sermons port · #64 hosting+release · #65 Phase 4 runbook + jsDelivr doc retirement · #66 release rebuild to main · #67 static cdn config + sermons 1.0.1 · #68 land stranded 1.0.1 · #69 release 1.0.1 to main · #70 silence build warnings · #71 release warnings · #72 studio discovery globs · #73 studio css crash · #74 studio render hardening · #75 studio Tailwind content.
