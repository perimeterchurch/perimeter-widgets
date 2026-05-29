# Phase 3 complete + Phase 4 prep — Session Handoff (2026-05-29)

> Hand-off snapshot for resuming after a multi-day session that shipped Phase 3 in full, the follow-up cleanups, Phase 4 design + plan, Phase 4's pre-flight code, and the first production release to `main`. Picks up at Gate A (Vercel provisioning) of the Phase 4 cutover plan.

## TL;DR

- Phases 1–3 are live on `main` (PR #58 merged). The new platform is shipping.
- Phase 4 cutover is operationally underway. Pre-flight code (CORS + sermons 1.0.0) is on dev/main (PR #57).
- **One PR is still open: #60 — fixes studio's `next build` failure under Turbopack by switching it to webpack.** Merge that before resuming Vercel work.
- Next concrete step: continue Gate A of the Phase 4 cutover plan (Vercel provisioning + DNS + MP OAuth registration). Vercel's project import file tree now shows `apps/cdn` and `apps/studio` because the rebuild is on `main`.

## Where the work lives

- **Umbrella spec:** `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`
- **Phase 3 spec:** `docs/superpowers/specs/2026-05-27-perimeter-widgets-phase-3-hosting-release-design.md`
- **Phase 3 implementation plan:** `docs/superpowers/plans/2026-05-27-perimeter-widgets-phase-3-hosting-release.md`
- **Phase 4 spec:** `docs/superpowers/specs/2026-05-28-perimeter-widgets-phase-4-cutover-design.md` — Status: **Approved**, all 7 open questions resolved
- **Phase 4 implementation plan:** `docs/superpowers/plans/2026-05-29-perimeter-widgets-phase-4-cutover.md`
- **Follow-up tracker:** `docs/superpowers/followups-2026-05-28.md`
- **Prior session handoff:** `docs/superpowers/handoffs/2026-05-28-phase-3-session-handoff.md` (covers everything before this session started)

## State of the repo

- **Branches:**
  - `main` — has the full Phase 1-3 rebuild + Phase 4 pre-flight code (PRs #50, #51, #54, #55, #56, #57, #58 all landed)
  - `dev` — same as main, plus the conflict-resolution merge from PR #59
- **Sermons version:** `widgets/sermons/package.json` is at `1.0.0` (Phase 4 spec decision 1)
- **CDN serves CORS:** `apps/cdn/next.config.ts` sets `Access-Control-Allow-Origin: *` on all responses (Phase 4 spec decision 6)
- **Bundle:** `dist/sermons/sermons.iife.js` builds at 801 KB gz (matches the 850 KB budget)
- **Studio build:** uses webpack (not Turbopack) since PR #60 — required because Turbopack's `rules` config doesn't accept `?raw` query patterns and the widget inlines the pdf.js worker via `?raw`

## What got done this session

Chronologically, this session:

1. **Finished Phase 3 (Chunks 2-7).** Resumed from the prior session's Chunk 1 boundary; shipped the Vercel driver + `getStore` selector, the `apps/cdn` Next app with all four route handlers, the `publishWidget` orchestration + CLI, studio Better Auth + MP OAuth, the `/admin/releases` UI, and the end-to-end memory-driver integration test. Plus the `apps/cdn/README.md`, `apps/studio/README.md`, and `CLAUDE.md` Status update. **Result: PR #50 (rebuild → dev), 79 commits.**
2. **Captured Phase 3 follow-ups** in `docs/superpowers/followups-2026-05-28.md` — ten items grouped by ordering (hardening pass, cutover blockers, Phase 4 cutover, operational follow-ups, opportunistic).
3. **Production hardening pass (#4 + #5 + #6).** 404 `cache-control: public, max-age=60` on CDN routes; gate `/admin` bare path in middleware matcher; gitignore `apps/*/next-env.d.ts`. **Result: PR #51.**
4. **Cutover blockers (#7 + #8).** Static `sermons-` nuqs URL prefix; inlined pdf.js worker via `?raw` + blob URL (removes `unpkg.com` runtime dep). Bundle grew from 512 → 801 KB gz; budget raised from 680 → 850 KB. **Result: PR #52.**
5. **Phase 4 design spec.** Initial draft as `Status: Draft` with 7 open questions; reframed as `Status: Approved` after answers (notably decision 4: hard cut from jsDelivr — no parallel-running period because there's no live jsDelivr traffic to preserve). **Result: PR #53.**
6. **Resolved PR #54** (a pre-existing CLAUDE.md additions PR that conflicted after the rebuild merge). Merge-into-branch resolution, no force-push.
7. **Forwarding merge PR #55** to bring #52 and #53's content to `dev` after they had merged into the rebuild branch but missed the cutover-to-dev window.
8. **Phase 4 implementation plan.** Seven chunks mirroring Gates A–F from the spec. **Result: PR #56.**
9. **Phase 4 Chunk 1 — pre-flight code.** Added `Access-Control-Allow-Origin: *` to apps/cdn via `next.config.ts headers()` (with a small `corsHeaders` helper + test); bumped sermons version to 1.0.0; updated `widgets/sermons/tests/bundle.test.ts` to read the expected version from `package.json` dynamically (the hard-coded `0.0.0` assertion was actually broken, not just fragile as the plan reviewer predicted). **Result: PR #57.**
10. **First production release.** Opened `Release: widgets platform rebuild (Phases 1–3) + Phase 4 pre-flight` from dev → main. Hit a single conflict on `dist/manifest.json` (legacy committed it; rebuild gitignores it). Resolved via the standard "merge main into dev first" pattern. **Result: PR #58 (the release) + PR #59 (the conflict resolution).**
11. **CI fix.** Once apps/studio reached main, GitHub Actions started running on it and the build failed with a Turbopack `?raw` import error. Switched studio to webpack via `bundler: 'webpack'` + `next.config.ts` resourceQuery rule; deleted the legacy `build-and-purge.yml` workflow (jsDelivr retirement, Gate F task pulled forward). **Result: PR #60 (currently open, not yet merged).**

## Open PRs

| # | Title | State |
|---|---|---|
| **#60** | `chore(ci): delete legacy build-and-purge workflow + fix studio build under Turbopack` | **OPEN — needs merge** |

All others (#50 through #59) are merged.

## Where to pick up

### Step 1: Merge PR #60

This unblocks two things: CI emails stop, and studio's Vercel deploy in Gate A will succeed instead of failing at `next build`.

### Step 2: Resume Gate A of the Phase 4 cutover plan

The plan is at `docs/superpowers/plans/2026-05-29-perimeter-widgets-phase-4-cutover.md`. Gate A starts at Task 4. As of the end of this session, the operator (you) was attempting Task 4 (create Vercel projects) and got blocked because `apps/cdn` and `apps/studio` didn't show up in Vercel's project-import file tree — because the rebuild hadn't reached `main` yet. **That blocker is now resolved** (the rebuild merged to main in PR #58). When you go back to Vercel's import flow, the file tree should list `apps/cdn` and `apps/studio`.

Gate A's six steps:

1. **Create two Vercel projects** (`apps/cdn` → `widgets.perimeter.org`, `apps/studio` → `studio.perimeter.org`).
2. **Provision a Vercel Blob store**, bind to both projects, ensure `BLOB_READ_WRITE_TOKEN` and `BLOB_PUBLIC_BASE_URL` are set in both projects' Production + Preview env scopes.
3. **Provision Upstash Redis** via Vercel Marketplace, bind to both. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` auto-inject.
4. **Studio-only env vars:** `BETTER_AUTH_SECRET` (generate via `openssl rand -base64 32`, separate values for Production vs Preview), `BETTER_AUTH_URL` (`https://studio.perimeter.org`), `MP_API_BASEURL` + `MP_API_CLIENT` + `MP_API_SECRET` (copy from helpdesk/metrics Vercel projects).
5. **Register MP OAuth redirect URI:** `https://studio.perimeter.org/api/auth/callback/ministryplatform` in the Ministry Platform admin.
6. **Configure DNS:** CNAMEs for `widgets.perimeter.org` and `studio.perimeter.org` per Vercel's domain wizard. Wait for propagation.

### Step 3: Validate Gate A

```bash
curl -i https://widgets.perimeter.org/manifest.json
# Expected: HTTP 200, body `{}`, headers:
#   access-control-allow-origin: *
#   cache-control: public, s-maxage=300, stale-while-revalidate=86400

curl -i https://widgets.perimeter.org/sermons/latest.js
# Expected: HTTP 404, headers:
#   cache-control: public, max-age=60
#   access-control-allow-origin: *

curl -i https://studio.perimeter.org/
# Expected: HTTP 200 with the studio shell HTML

# Then in a browser, navigate to:
# https://studio.perimeter.org/admin/login
# Expected: MP sign-in button renders. DO NOT click it yet — Gate C.
```

Once all four pass, Gate A is done. Proceed to Gate B (first production publish) per the plan.

## Plan deviations during this session (worth knowing)

These all happened in commits that are now on dev/main; they aren't pending. Listed here so the next session knows what to expect when reading the plan vs. the code:

1. **Phase 4 plan Task 1 went sync.** Plan specified `async corsHeaders()`; ended up `function corsHeaders(): HeaderEntry[]` because the async-with-no-await triggered `require-await` lint. Next.js accepts both forms.
2. **Bundle test was actually broken, not just fragile.** The plan reviewer's advisory note about `bundle.test.ts` hard-coding `'0.0.0'` predicted it'd silently keep passing after the bump. It actually broke — the bundle's only `0.0.0` occurrences were the widget's own version. Fixed in the same commit as the bump; the test now reads `pkg.version`.
3. **Studio bundler is webpack, not Turbopack** (PR #60). Phase 4 plan didn't anticipate this; future studio work should pass `--webpack` or expect webpack semantics.
4. **`build-and-purge.yml` deleted early.** Phase 4 plan put this in Gate F; pulled forward to PR #60 because it was spamming CI failures.

## Outstanding follow-ups (post-Gate F)

From the tracker:

- **#1 — `loader.js`** (defer until widget #2)
- **#2 — GitHub Actions auto-publish** (defer until after first manual publish proves the flow)
- **#9 — Upstash `REDIS_URL`-only adapter** (only if provisioning surprises us)
- **#10 — `middleware.ts` → `proxy.ts` rename** (defer opportunistically)
- **pdf.js worker optimization** — host worker at `widgets.perimeter.org/static/` with CORS headers; drop the inlined copy. Returns the bundle from ~801 KB to ~512 KB. Do AFTER Phase 4 stabilizes.

## Standing constraints (DO NOT violate)

1. **Never push to main directly.** Even now that the rebuild is live, `main` is release-only via batched PR from `dev`.
2. **Never push to dev directly.** All changes reach `dev` via PR.
3. **Always use `pnpm`.**
4. **Conventional commits via heredoc** (`git commit -F -`), never `-m` for multi-line bodies. Include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` on commits authored during the session.
5. **PR bodies via `--body-file`** (Write tool to a temp file), never inline `--body`.
6. **Repo path:** `/Users/parkerb/dev/perimeter/claude/perimeter-widgets/` (the project lives under a parent workspace, but git operations run from this subdirectory).

## Resume prompt (paste into a fresh Claude Code session)

```
I'm resuming Phase 4 of the perimeter-widgets cutover. Phase 3 is fully shipped (PR #58 landed on main); Phase 4 pre-flight code (PR #57) is live; Phase 4 spec and plan are on dev. The only open PR is #60 (CI fix + studio webpack bundler) which needs merging first.

Read these files in order:
1. docs/superpowers/handoffs/2026-05-29-phase-3-complete-phase-4-prep-handoff.md — this handoff (full state + resume instructions)
2. docs/superpowers/specs/2026-05-28-perimeter-widgets-phase-4-cutover-design.md — Phase 4 design spec, approved
3. docs/superpowers/plans/2026-05-29-perimeter-widgets-phase-4-cutover.md — Phase 4 implementation plan (currently at Chunk 2 Task 4 — Gate A Vercel provisioning)

Then walk me through resuming Gate A. The operator (me) was about to create Vercel projects when the previous session ended. I'll need help with the validation curls after I finish the dashboard work; I won't need help with the dashboard clicks themselves.

Standing constraints (DO NOT violate):
- Never push to main or dev directly; all changes via PR
- Use pnpm; conventional commits via heredoc with Co-Authored-By footer
- PR bodies via --body-file (Write tool to temp file), never inline --body
- Git repo is at perimeter-widgets/
- LSP "Cannot find module" diagnostics right after creating files are false positives — trust pnpm --filter <pkg> typecheck
```
