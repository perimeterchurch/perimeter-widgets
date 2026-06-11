# Deferred audit items + sermons polish + pdf-worker split — Session Handoff (2026-06-11)

> Snapshot for resuming in a new session. **PRs #124–#127 are MERGED to `dev`, all
> branches deleted, local `dev` synced and verified** (quality 45/45 forced-uncached,
> studio visual 29/29, parity pdf-worker e2e 1/1). The only outstanding work is the
> sermons release (`--minor` → 1.4.0) and the batched dev→main release PR.

## What shipped (all merged to `dev`)

| PR | What | Notes |
| --- | --- | --- |
| #124 | **Sermons a11y polish + `text-2xs` token** | `MotionConfig reducedMotion="user"` at the App root (WCAG 2.3.3 — y-slides drop for reduced-motion visitors, opacity fades stay); volume-slider `focus-visible` ring (matches the seek slider); DateRangePopover Escape moved off `document` onto the panel keydown the focus trap guarantees (host handlers can't swallow it); PDF thumbnail sidebar + toggle hide below the `@sm` container breakpoint. `text-2xs` (10px, lh 1.4) joined the type scale — all theme plumbing (preset/editor/tokens page/DTCG) picked it up generically; eight `text-[10px]` micro-label sites migrated pixel-identically, the lone `text-[11px]` (AM/PM toggle) snapped to `text-xs`. |
| #125 | **Loader evergreen-API decision + canary** | Decision record `docs/superpowers/decisions/2026-06-11-loader-evergreen-api.md` blesses `loader.js` + `manifest.json` (+ `latest.js`) as the public embed contract: frozen surfaces, rollback = manifest pointer revert, `loader2.js` escape hatch. NEW: `data-perimeter-version` on a placeholder pins that widget to a specific immutable bundle (staging/canary; first div per name wins; works for not-yet-promoted versions). `packages/parity/tests/loader.test.ts` runs the real loader IIFE against a stub document inside `pnpm quality`. Changesets verdict recorded too (`…/2026-06-11-changesets-deferred.md`): NOT adopted; triggers = 2nd contributor or ~4+ widgets. |
| #126 | **Visual-regression spike → pixel baselines** | `studio/visual/screenshot-baselines.spec.ts`: sermons light+dark via `toHaveScreenshot`, Darwin baselines committed (visual suite is local-only; CI runs `pnpm quality`). KEY FINDING (decision record `…/2026-06-11-visual-regression.md`): a clearly visible regression (italicized card titles) moved only ~400 px — `maxDiffPixelRatio: 0.001` silently passed it. **Rule: absolute `maxDiffPixels` (100), never a ratio.** Argos deferred with trigger: adopt when the visual suite moves into CI. Update intentional changes: `pnpm --filter @perimeter/studio visual -- --update-snapshots`. |
| #127 | **pdf.js worker split** | Bundle **782 → 509 KB gz** (worker was 37% of it). Worker now an immutable sibling (`cdn/<name>/<version>/pdf.worker.min.mjs`): emitted by `widgets/sermons/vite.config.ts` `generateBundle` from the same pdfjs-dist install (version-drift impossible); release CLI copies `dist/` recursively; `lib/script-base.ts` captures the bundle's own URL from `document.currentScript` at IIFE eval; `lib/pdf-worker.ts` fetches on FIRST PDF open and blob-installs (cross-origin Workers are browser-blocked; same `worker-src blob:` CSP posture as the old inline). Budget test tightened 900 → 600 KB as the regression lock. |

## Verification state (2026-06-11, merged dev)

- `pnpm quality --force`: 45/45 (sermons bundle 508.8 KB gz)
- Studio visual harness: 29/29 (incl. host-sim dark-theme surface + new pixel baselines)
- **Parity pdf-worker e2e** (`packages/parity/visual/pdf-worker-e2e.spec.ts`, added post-merge):
  the BUILT bundle through the real loader→manifest→fixture path fetched
  `/sermons/dev/pdf.worker.min.mjs` and rendered a real PDF page to canvas — the full
  production path of #127 is proven, not inferred.

## Gotchas learned this session (encoded in code comments, recorded here)

- **Vite lib mode inlines imported assets** — a `?url` import of the worker becomes a
  ~1 MB base64 data URL in the IIFE. Emit sibling artifacts with `emitFile`, never the
  asset graph.
- **Rollup bundles dynamic-import targets even in define-eliminated dead branches**
  (`if (import.meta.env.DEV) { await import(...) }` still shipped the worker module,
  +166 KB gz). The dev path must avoid any statically-visible import: build the URL
  from a non-literal at runtime.
- **Pixel-diff ratios swallow small-area regressions** — typography/small-control
  changes move only hundreds of pixels. Absolute `maxDiffPixels` budgets only.
- **Verify sensitivity, not just stability**: the baselines passed 6 consecutive runs,
  but only a deliberate perturbation (make a visible change → expect failure → revert)
  exposed the ratio problem.

## Docs updated this session

- `docs/hosting-and-release.md` — version dirs hold arbitrary immutable artifacts;
  release copies `dist/` recursively; canary embed section (from #125).
- `docs/reference/embed-guide.md` — "Pinning a Version (Canary)" section; PDF
  troubleshooting entry (worker fetch + CSP `connect-src`/`worker-src blob:`).
- `CLAUDE.md` — release row (recursive artifacts), studio visual row (baselines +
  update-snapshots + maxDiffPixels rule), new parity visual row.
- `docs/superpowers/decisions/` — three decision records (loader API, changesets,
  visual regression).

## Pick-up points

1. **Cut the sermons release**: `pnpm release sermons --minor` → **1.4.0** (minor
   because the artifact layout changed — the worker file joins the version dir).
   Merge its PR into dev. Optionally canary-verify 1.4.0 on a staging page via
   `data-perimeter-version="1.4.0"` before/after promotion.
2. **Open the batched dev→main release PR** (root CLAUDE.md rules: `git fetch --prune`,
   compare `origin/main..origin/dev`, `Release:` title, body grouped by
   conventional-commit type). This ships everything since 1.3.1 to prod
   (widgets.perimeter.org deploys from main): dark-theme surface fix, muted-fg
   contrast, shadow/type tokens (+ `text-2xs`), a11y polish, loader canary, worker
   split.
3. Standing watch items from the 2026-06-10 audit (DTCG toolchain, custom-element
   embeds, declarative adoptedStyleSheets, Storybook shadow DOM) — re-check ~6–12 months.
