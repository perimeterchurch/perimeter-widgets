# Perimeter Widgets Streamline — Phase 4 (Production Cutover) Plan + Runbook

> **For agentic workers:** Part A (repo cleanup) is executable now via superpowers:executing-plans / subagent-driven-development; steps use checkbox (`- [ ]`). Part B is an **operational runbook** the repository owner drives (it needs Vercel + WordPress access) — its steps are gates, not code edits.

**Goal:** Take the streamlined platform live — deploy `cdn/` to `widgets.perimeter.org`, embed the sermons widget on WordPress for the first time, and finalize the migration (retire the dormant jsDelivr-era docs/branches). After Phase 4, the new platform *is* production and there is no dev/prod skew.

**Framing (confirmed 2026-06-01):** This is a **first production launch**, not a flip. jsDelivr is **not** serving any live WordPress page today, so there is no A/B-vs-legacy comparison, no parallel-running period, and no "fall back to the working legacy widget." The risk profile is "deploy new infra to production," and rollback means **removing/disabling the new embed**, not restoring a legacy one. The two historical code blockers are already resolved by the rebuild: bookmarkable URLs (static `NUQS_PREFIX` in `widgets/sermons/src/App.tsx`) and the pdf.js worker (inlined via `?raw` blob in `PdfViewer.tsx`, no unpkg). The jsDelivr CI pipeline is already deleted.

**Reframed decisions** (carried from the approved 2026-05-28 cutover spec; infra updated to the static-`cdn/` model):

| # | Decision |
|---|----------|
| 1 | First production sermons version is **`1.0.0`** (already released to `cdn/sermons/1.0.0/`). |
| 2 | Smoke-matrix validation runs on a **private/unpublished WordPress page** on production WP (no staging WP exists). |
| 3 | **Hard cut** — no parallel-running period (nothing live to run in parallel with). |
| 4 | Rollback authority: **repository owner only**. |
| 5 | **Vercel deployment logs** are sufficient for launch-week traffic/error monitoring; no new analytics. |
| 6 | The WordPress embed uses **`widgets.perimeter.org/sermons/latest.js`** (manifest-resolved) for auto-update, OR the pinned `…/sermons/1.0.0/index.js` for an immutable launch — owner's choice at Gate D. |
| 7 | `legacy/v1` is archived (kept as a branch/tag for reference) once the new embed is stable for the agreed window. |

**Spec:** `docs/superpowers/specs/2026-05-29-perimeter-widgets-streamline-redesign-design.md`. **Supersedes** the old `2026-05-28-perimeter-widgets-phase-4-cutover-design.md` (old infra). **Depends on:** Phase 3 (`cdn/` + `pnpm release`) merged to `dev`.

---

## Part A — Repo cleanup + launch-correctness fix (executable now)

### Task A.0: Fix sermons config coercion so `data-*` overrides work

Review finding: `widgets/sermons/src/types.ts` declares `perPage: z.number().default(12)`. Every `data-*` attribute arrives as a string and the runtime's `parseDataAttrs` only converts `"true"/"false"` to booleans (numbers stay strings), so a real embed of `data-per-page="12"` makes `schema.parse` **throw** and `mount()` breaks. (The `hide*` `z.coerce.boolean()` fields are fine — the runtime pre-converts booleans.) This blocks any configurable embed at launch.

**Files:**
- Modify: `widgets/sermons/src/types.ts`
- Modify/add test: `widgets/sermons/tests/types.test.ts`

- [ ] **Step 1: Failing test** — add to `widgets/sermons/tests/types.test.ts`: `expect(SermonsConfigSchema.parse({ perPage: '12' }).perPage).toBe(12)` (string in, number out — mirrors what `data-per-page` yields). Run the sermons test → it FAILS today (`Expected number, received string`).
- [ ] **Step 2: Fix** — change `perPage: z.number().default(12)` to `perPage: z.coerce.number().int().min(1).default(12)`. (Coercion only; the `z.coerce.*` and `z.enum` fields already accept strings; `defaultView`/`defaultTab` enums accept the literal attribute strings.)
- [ ] **Step 3: Verify** — `pnpm exec turbo run test typecheck --filter=@perimeter/widget-sermons` → PASS. Then re-build + the bundle test still passes (`pnpm exec turbo run test --filter=@perimeter/widget-sermons` rebuilds the IIFE).
- [ ] **Step 4: Commit.** `git add widgets/sermons/src/types.ts widgets/sermons/tests/types.test.ts && git commit -m "fix(widget-sermons): coerce perPage so data-per-page string attrs work in production embeds"`

## Repo cleanup (docs)

The active docs still describe the **old** jsDelivr-from-GitHub serving model. `docs/hosting-and-release.md` (Phase 3) is the correct canonical hosting doc. Bring the rest in line. Scope is strictly the hosting/jsDelivr references — not a full docs audit (historical files under `docs/superpowers/` are point-in-time records and are left as-is).

**Branch:** this work is on `docs/widgets-phase-4-cutover` (already cut from `dev`; the plan doc itself is committed here). Land via PR into `dev`.

### Task A.1: Replace the stale CDN architecture doc

**Files:**
- Rewrite: `docs/architecture/cdn-deployment.md`

- [ ] **Step 1:** Replace the entire body of `docs/architecture/cdn-deployment.md` (currently jsDelivr serving + cache purging + GitHub Action — all obsolete) with a short doc describing the **current** model and pointing at the canonical source: static `cdn/` Vercel project at `widgets.perimeter.org`, immutable `cdn/<name>/<version>/index.js`, `manifest.json` pointer, `vercel.json` cache/CORS + `latest.js` rewrites, `pnpm release <name>`, promote = merge the manifest change, rollback = revert or Vercel Instant Rollback. End with: "Full flow, headers, and embed snippets: `docs/hosting-and-release.md`." Keep it under ~30 lines — it's a redirect/summary, not a duplicate.
- [ ] **Step 2: Verify** no remaining jsDelivr/purge wording: `grep -in "jsdelivr\|purge" docs/architecture/cdn-deployment.md` → no matches.
- [ ] **Step 3: Commit.** `git add docs/architecture/cdn-deployment.md && git commit -m "docs(widgets): rewrite cdn-deployment.md for the static cdn/ model (retire jsDelivr)"`

### Task A.2: Fix the remaining jsDelivr references in active docs

**Files (read each before editing):**
- Modify: `docs/README.md`, `docs/architecture/overview.md`, `docs/architecture/vite-preset.md`, `docs/guides/developer-setup.md`, `docs/guides/adding-a-widget.md`, `docs/reference/embed-guide.md`, `docs/widgets/sermons.md`

- [ ] **Step 1:** Replace the obsolete statements in each:
  - `docs/README.md`: "CDN & Deployment — jsDelivr serving, cache purging, GitHub Action pipeline" → "CDN & Deployment — static `cdn/` on Vercel (`widgets.perimeter.org`), `pnpm release`, manifest pointer".
  - `docs/architecture/overview.md`: **all** stale lines (not just the index link) — the committed root `dist/` as CDN output, the `postbuild` `dist/manifest.json` generator, and jsDelivr/cache-purge/GitHub-Action wording (around lines 18, 39, 47, 103, 109) → the static-`cdn/` + `pnpm release` model.
  - `docs/architecture/vite-preset.md`: output described as `../../dist/<name>/<name>.js` / "Root `dist/` folder for CDN" (~line 39) → `dist/index.js` per widget, copied into `cdn/<name>/<version>/` by `pnpm release`.
  - `docs/guides/developer-setup.md`: "The `dist/` directory is committed to the repo for jsDelivr CDN serving." → each widget builds to its own `dist/index.js`; `pnpm release <name>` copies the immutable artifact into `cdn/` (committed there), served by the Vercel static project. Root `dist/` is no longer the serving source.
  - `docs/guides/adding-a-widget.md`: replace jsDelivr/publish-widget/`dist/`-serving wording with the new flow (`widgetConfig`, `pnpm release <name>`, studio auto-discovery); cross-link `docs/creating-a-widget.md`.
  - `docs/reference/embed-guide.md`: replace the `cdn.jsdelivr.net/.../dist/<name>/<name>.js` snippets (~lines 17, 54, 66, 70) with `https://widgets.perimeter.org/<name>/latest.js` (and the pinned `…/<version>/index.js` variant); replace the jsDelivr `@latest` 7-day-cache/auto-purge section (~128–131) and the `?v=timestamp` cache-busting advice with: immutable versioned URLs need no purge, and `latest.js`/manifest propagate within ~a minute via `s-maxage`+SWR. Use the **correct** sermons attributes (see note below).
  - `docs/widgets/sermons.md`: replace the `cdn.jsdelivr.net/.../dist/sermons/sermons.js` embed (~line 26) with the `widgets.perimeter.org` snippet, and fix the config attributes to the real schema (`data-per-page`, `data-default-view`, `data-default-tab`, `data-series-id`, etc.). (The doc's `data-campus` attribute has no schema field — drop it or flag as a follow-up; not a Phase 4 blocker.)
  > **Correct sermons embed attributes** (camelCase schema field → kebab `data-*`): `perPage`→`data-per-page` (now coerced, Task A.0), `defaultView`→`data-default-view` (`grid|list|large`), `defaultTab`→`data-default-tab` (`sermons|series`), `seriesId`→`data-series-id`, `display`→`data-display`. There is **no** `data-limit`/`data-initial-view`/`data-campus`.
- [ ] **Step 2: Verify** active docs are clean: `grep -rin "jsdelivr\|publish-widget\|purge" docs/README.md docs/architecture docs/guides docs/reference docs/widgets` → no matches (historical `docs/superpowers/**` intentionally untouched).
- [ ] **Step 3: Commit.** `git add docs/README.md docs/architecture/overview.md docs/architecture/vite-preset.md docs/guides/developer-setup.md docs/guides/adding-a-widget.md docs/reference/embed-guide.md docs/widgets/sermons.md && git commit -m "docs(widgets): purge stale jsDelivr/publish-widget refs from active docs; fix embed snippets"`

### Task A.3: Update CLAUDE.md to the production-launch state

**Files:**
- Modify: `perimeter-widgets/CLAUDE.md`

- [ ] **Step 1:** Update the Status section: Phase 4 is the production launch runbook (`docs/superpowers/plans/2026-06-01-…phase-4-cutover.md`); note that going live requires the one-time Vercel deploy of `cdn/` + the WordPress embed (owner-driven); the code blockers (#7 nuqs, #8 pdf worker) are resolved; jsDelivr is retired. Keep the existing Phase 1–3 summaries.
- [ ] **Step 2:** Add a one-line pointer to `docs/hosting-and-release.md` as the canonical hosting/embed doc (if not already present).
- [ ] **Step 3: Format + gate.** `pnpm format && pnpm quality` → PASS (docs-only changes; the gate runs `format:check`). Then `git add perimeter-widgets/CLAUDE.md && git commit -m "docs(widgets): CLAUDE.md reflects Phase 4 production-launch state"`

### Task A.4: PR

- [ ] **Step 1:** Push `docs/widgets-phase-4-cutover`; open a PR into `dev` with `--body-file` (Write tool). Body: the doc cleanup (jsDelivr retirement in active docs), that this also lands the Phase 4 runbook, and that **production launch itself is the owner-driven runbook in Part B (not done by this PR)**.
- [ ] **Step 2:** superpowers:requesting-code-review before requesting human review.

---

## Part B — Production cutover runbook (owner-driven; gated)

Each gate has a **go/no-go** condition and a **rollback**. Do them in order; do not proceed past a no-go. These steps need Vercel + WordPress access (not available to the agent) — the owner executes; the agent can assist with verification commands and the embed snippet.

### Gate A — Deploy `cdn/` to Vercel
- **Do:** Create a **new Vercel project** from this repo with **root directory = `cdn/`**, **framework preset = Other / no build command** (it's static files; `vercel.json` provides headers + rewrites). Deploy `dev` (or `main` after the Part A PR merges). Attach the domain **`widgets.perimeter.org`** to this project (separate from `style.perimeter.org`). See `docs/hosting-and-release.md` → "Deploying the CDN".
- **Go/no-go:** the deploy succeeds and the project's domain resolves.
- **Rollback:** none needed (no traffic yet); delete the project if misconfigured and redo.

### Gate B — Verify the CDN serves correctly
- **Do (agent can run these):**
  - `curl -sI https://widgets.perimeter.org/sermons/1.0.0/index.js` → `200`, `cache-control: public, max-age=31536000, immutable`, `access-control-allow-origin: *`.
  - `curl -s https://widgets.perimeter.org/manifest.json` → `{"example":"0.0.0","sermons":"1.0.0"}`, with `cache-control: …s-maxage=60, stale-while-revalidate=86400`.
  - `curl -sI https://widgets.perimeter.org/sermons/latest.js` → resolves (rewrite) to the `1.0.0` bundle, `200`.
  - `curl -sI https://widgets.perimeter.org/loader.js` → `200`.
- **Go/no-go:** all four return the expected status + headers. A wrong/missing `cache-control` or a `latest.js` that 404s is a **no-go** (fix `vercel.json` / the deploy first).
- **Rollback:** none (no traffic).

### Gate C — Smoke-matrix on a private WordPress page
- **Do:** On production WordPress, create a **private/unpublished** page. Add the embed (Gate D snippet). Walk the smoke matrix: desktop + mobile; grid + list views; series → sermon navigation; filters (speaker/book/service type) + a bookmarkable filter URL survives reload (validates the static nuqs prefix); a sermon with a **PDF** (validates the inlined worker + react-pdf CSS in the shadow root); audio + video (HLS) playback; no console errors; styles isolated (no host-page CSS bleed).
- **Go/no-go:** the matrix passes with no broken view, no console errors, and correct shadow-root styling. Any functional break is a **no-go** — file it, fix on a branch, `pnpm release sermons` a patch version, redeploy, re-test.
- **Rollback:** delete/leave-private the test page (never published).

### Gate D — Embed on the public WordPress page (the launch)
- **Do:** Add the embed to the target public page. Simplest correct launch (defaults give the sermons tab, grid view, 12/page):
  ```html
  <div data-perimeter-widget="sermons"></div>
  <script src="https://widgets.perimeter.org/sermons/1.0.0/index.js" async></script>
  ```
  To override config, use the **real** schema attributes (verified against `widgets/sermons/src/types.ts`): e.g. `data-per-page="12"` (works after Task A.0's coercion fix), `data-default-view="grid|list|large"`, `data-default-tab="sermons|series"`, `data-series-id="…"`. There is **no** `data-limit`/`data-initial-view`. For auto-updating embeds use `…/sermons/latest.js` instead of the pinned `…/1.0.0/index.js` (picks up future promotions within ~a minute). (Note: the nuqs URL prefix is a fixed `sermons-`, so multiple sermons widgets on one page would share filter params — a documented, accepted limitation; an `id` attribute does not change this.)
- **Go/no-go:** the published page renders the widget for real visitors; spot-check desktop + mobile.
- **Rollback:** **remove the `<div>` + `<script>`** from the page (reverts to no widget — there is no legacy to restore). If the bundle itself is bad, `pnpm release sermons` a fixed patch + redeploy, or Vercel Instant Rollback the CDN project.

### Gate E — Monitor (launch week)
- **Do:** Watch **Vercel deployment/CDN logs** for the CDN project over the agreed window (default **~1 week**): request volume to `sermons/*` + `manifest.json`, 4xx/5xx rates, and any error spikes. Spot-check the live page periodically.
- **Go/no-go to finalize:** stable for the window — no elevated error rate, no rendering complaints.
- **Rollback:** as Gate D.

### Gate F — Finalize
- **Do:** Archive `legacy/v1` (keep the branch or convert to a tag `legacy-v1`; it's reference-only now). Confirm no jsDelivr build target/workflow remains (already deleted — verify `.github/workflows/` has only `ci.yml`). Update `CLAUDE.md` Status to "Phase 4 complete — new platform serves production." Close out the streamline project.
- **Go/no-go:** N/A (cleanup).

---

## Done-when (Phase 4 acceptance)

**Part A (this PR):** active docs no longer describe jsDelivr serving; `cdn-deployment.md` summarizes the static model and points at `docs/hosting-and-release.md`; `CLAUDE.md` reflects the launch state; `pnpm quality` green.

**Part B (owner-driven, tracked separately):** `widgets.perimeter.org` deployed and serving (Gate B verified); sermons embedded on the public WordPress page and rendering for visitors (Gate D); stable across the monitoring window (Gate E); `legacy/v1` archived (Gate F). After Gate F, the streamline rebuild is complete and the new platform is production.
