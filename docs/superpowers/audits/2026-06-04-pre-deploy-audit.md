# Pre-Deploy Audit — perimeter-widgets dev→main

**Verdict: GO (with notes)**

The dev→main release candidate is safe to ship. All six audit dimensions pass or
pass-with-non-blocking-concerns. There are **0 confirmed blockers**. The release
changes **no production widget bundle** (`git diff --stat origin/main..origin/dev -- cdn/`
is empty), so the live `widgets.perimeter.org` CDN posture is byte-for-byte unchanged.
Open the release PR now; track the one should-fix-later (turbo `test` task missing a
`^build` dependency) as a follow-up.

- **Range audited:** `origin/main` (01bf720) → `origin/dev` (3d1dae6)
- **Commits:** 41
- **Audit date:** 2026-06-04
- **Auditor:** lead synthesis over 6 dimension agents (gate, parity-bundles, studio-prod, docs, dx-safety, security-hygiene)

---

## Release contents

Phases 3–5 of the streamline redesign: the Vite **studio** (read-only design-system
gallery for `style.perimeter.org`), **docs** (component + guide MDX, deploying-studio
guide, post-streamline CLAUDE.md updates), **DX tooling** (`create-widget` scaffold,
`release --dry-run` CLI in `packages/release`), and the **creating-a-widget** skill.

The diff touches `studio/`, `docs/`, `packages/release`, `packages/vite-plugin-widget`,
and config only. It does **not** touch `cdn/` (no bundle, no `cdn/loader.js`, no
`cdn/vercel.json`), `turbo.json`, or `packages/parity`.

---

## Per-dimension verdicts

| Dimension | Verdict | Summary |
| --- | --- | --- |
| gate | **CONCERNS** (non-blocking) | CI-order flow is green: frozen-lockfile coherent, `pnpm build --force` exit 0, `turbo run typecheck lint test --force` 36/36 exit 0, `format:check` clean, 339 tests / 12 packages pass under cache bypass. One latent trap: `test` task lacks `^build` dep (see SFL-1). CI builds before testing, so the deploy gate is genuinely green. |
| parity-bundles | **PASS** | Dev/prod render parity holds — ui-attributable selector diffs 0, prod-only selectors 0, rem→px 0, value diffs 0. Regression gate 15/15 (after build). Bundles intact: single IIFE, inlined CSS, compiled Tailwind; sermons gz 856.6 KiB < 900 KiB budget. Committed CDN bundles byte-identical to fresh builds; prod serves manifest matching main. |
| studio-prod | **PASS** | `@perimeter/studio` builds clean (all MDX bundles), dev-only built-bundle preview correctly tree-shaken (`import.meta.env.DEV`), SPA rewrite regex correct, 50/50 studio tests pass (0 cached), `docs/deploying-studio.md` accurate. |
| docs | **PASS** | Stale-token sweep clean, all index + relative links resolve, deleted-file references zero, both CLAUDE.md files reflect post-streamline shape, every source spot-check passes. One cosmetic note (SFL nits). |
| dx-safety | **PASS** | `create-widget` scaffolds/builds (single IIFE)/tests green and removes cleanly; `release --dry-run` has zero git side effects; release tests contain no real push / `gh pr create` / `execSync`; skill frontmatter + cited paths all resolve. None of this touches the CDN deploy. |
| security-hygiene | **PASS** | Diff touches no cdn bundle. Release CLI shell interpolation is JSON.stringify-quoted; widget names validated kebab-case; studio iframe srcdoc is DEV-only with non-attacker inputs. Secrets scan clean (only the documented public `mpp-widgets_AuthToken` key name appears). No stray files; commits conventional. |

---

## Confirmed blockers (0)

None. No dimension surfaced a deploy-blocking defect, and none was found on
adversarial re-verification.

---

## Should-fix-later

### SFL-1 (important) — turbo `test` task lacks a `^build` dependency

`turbo.json` declares the `test` task with `dependsOn: ["^typecheck"]` and **no** build
dependency. `packages/parity/src/serve-fixture.ts` serves `widgets/<name>/dist/index.js`
from disk and `serve-fixture.test.ts` asserts `manifest.example === 'dev'` (line 27) and
that the bundle endpoint returns 200 (line 47) — both require a prior widget build.

Confirmed by repro: with `widgets/example/dist` removed,
`pnpm --filter @perimeter/parity test` → **2 failed / 13 passed** (the exact claimed
failures); restoring dist → 15/15 pass. `turbo run test --filter=@perimeter/parity
--dry=json` shows the task depends only on theme/vite-plugin-widget typecheck — it never
builds the example.

**Why not a blocker:** CI (`.github/workflows/ci.yml`) runs `pnpm install --frozen-lockfile`
→ `pnpm build` → `pnpm quality`, so dist exists before the gate. The diff also doesn't
touch `turbo.json` or `parity`, and the cdn bundle is unchanged.

**Fix:** add `dependsOn: ["^build"]` (or a build setup hook) to the `test` task so a
standalone `pnpm quality` / fresh-checkout gate is self-contained.

### Nits (cosmetic, no action required for this release)

- **[gate]** `pnpm quality` is documented in both CLAUDE.md files as a self-contained
  "gate before a PR" with no note that a prior `pnpm build` is required — compounds SFL-1.
  Either document the build-first requirement or fix the task graph.
- **[gate]** studio production build emits a Rollup >500 KB chunk warning (PdfViewer
  1,708 KB / 503 KB gz, VideoPlayer 528 KB). Build still exits 0. Studio is the separate
  owner-driven `style.perimeter.org` Vercel project — zero impact on the CDN release.
- **[gate]** turbo emits "no output files found" warnings for several library/test-only
  build/test tasks (declared `outputs` glob, nothing emitted). Harmless, noisy, slightly
  weakens cache fidelity.
- **[parity-bundles]** Parity reports list large dev-only selector counts (example 222,
  components 226). This is documented superset noise (studio chrome, other widgets) — the
  meaningful gate (ui-attributable + prod-only + value diffs) is all 0. No action.
- **[studio-prod]** Studio bundle chunks exceed Vite's 500 KB warning (sermons
  react-pdf / video deps pulled into the gallery for live preview). Gallery-only; not a
  shipped widget. Consider `manualChunks` / lazy route imports later.
- **[studio-prod]** Dynamic-vs-static import warning for `packages/ui/src/empty.tsx`
  during studio build — only prevents that module from splitting into its own chunk. No
  correctness impact.
- **[studio-prod]** Harness environment note: the worktree initially had HEAD at
  `origin/main` (41 commits behind dev); the dimension re-pointed to `origin/dev` before
  auditing. Not a repo defect — flagged so siblings can confirm they audited the candidate.
- **[docs]** `app.tsx` (example/scaffold) vs `App.tsx` (sermons) filename casing differs.
  Docs match the scaffolder convention, so they're accurate; latent inconsistency only.
- **[security-hygiene]** Studio iframe `srcDoc` has no `sandbox` attribute. DEV-only and
  tree-shaken from production; inputs (slug, url) are validated/local. `sandbox="allow-scripts"`
  would be reasonable defense-in-depth for the local harness but is not required.
- **[security-hygiene]** `cdn/loader.js` and `cdn/vercel.json` (CORS/cache headers) are
  unchanged by this diff — existing production security posture is unaffected (informational).

---

## What this release does and doesn't touch in production

**Does NOT touch (production unchanged):**
- `widgets.perimeter.org` CDN bundles — `git diff origin/main..origin/dev -- cdn/` is empty;
  committed bundles are byte-identical to fresh builds and match what prod serves.
- `cdn/loader.js` (host-page script injection) and `cdn/vercel.json` (CORS / immutable
  cache headers) — no change, so the loader fail-silent + 1yr-immutable posture is intact.
- `turbo.json` and `packages/parity` task graph.

**Does touch (non-production / owner-driven surfaces):**
- `studio/` → deployed to `style.perimeter.org`, a **separate owner-driven Vercel project**,
  not part of this dev→main CDN release. Owner triggers that deploy independently.
- `docs/`, `packages/release` (dev tooling), `packages/vite-plugin-widget`, the
  creating-a-widget skill, and config — developer-facing only.

Net: this is a docs / studio / DX-tooling release with **no production widget-bundle or
loader change**. The dev→main gate is green in CI order.
