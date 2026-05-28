# Perimeter Widgets — Phase 4: Production Cutover Design

**Status:** Draft
**Date:** 2026-05-28
**Author:** parkerb@perimeter.org (with Claude)
**Umbrella:** `2026-05-22-perimeter-widgets-rebuild-design.md`
**Prior phase:** `2026-05-27-perimeter-widgets-phase-3-hosting-release-design.md`

## Goal

Flip live WordPress sermon embeds from the legacy `cdn.jsdelivr.net/gh/perimeterchurch/.../legacy.js` URL to `widgets.perimeter.org/sermons/latest.js`, validate that real user traffic behaves correctly, and retire the legacy jsDelivr pipeline. After this phase, **the new platform is what serves production**, the `legacy/v1` branch is archived, and there is no dev/prod skew on the widget rendering path.

This is the operational phase, not a code phase. The infrastructure (`@perimeter/release-store`, `apps/cdn`, `apps/studio`, `pnpm publish-widget`) all exist as of Phase 3. What's missing is everything between "the code works locally" and "WordPress users see the new widget."

## Non-goals for Phase 4

- Building new widgets. Sermons is the only production widget; #2 ships on the existing platform.
- GitHub Actions auto-publish — the publish-widget script runs manually for the first release. Automation lands as a Phase 4 follow-up once we know the manual flow is correct.
- The `loader.js` global page-scan script — defer until the second widget exists.
- Bundle-size optimization to take pdf.js back out of the IIFE (tracked separately; see "Optimization tracked for after cutover" below).

## Cutover phases

Phase 4 is a sequence of irreversible-ish steps separated by validation gates. The structure is deliberate: every gate has a clearly defined "go / no-go" condition and an explicit rollback path. The sequence is:

```
A. Provision Vercel resources (Blob + Redis + env vars + DNS)
       ↓ validate: bootstrap a memory-driver publish; spot-check creds
B. First production publish (pnpm publish-widget sermons against prod store)
       ↓ validate: ledger entry, bundle blob, no `latest` pointer
C. Studio admin sign-in + first promote
       ↓ validate: /sermons/latest.js 302s to /sermons/<version>/index.js;
         manifest.json reflects the promotion
D. Shadow-mode validation on a staging WordPress instance
       ↓ validate: behavioral parity with legacy across the smoke matrix below
E. WordPress flip in production (the binary moment)
       ↓ validate: error rates + traffic shape match prior-week baseline; user reports clean
F. jsDelivr retirement
       ↓ validate: 7+ days of clean traffic; no cdn.jsdelivr.net hits in CDN logs
```

Each phase is a manual operation by a named human. There is no automation in this phase — every step is a deliberate, reviewable change.

### A. Provision Vercel resources

**Done by:** Repository owner with Vercel team-admin access.

Steps:

1. **Vercel project: `apps/cdn`**
   - Link the repo subdirectory `apps/cdn` to a new Vercel project.
   - Domain: `widgets.perimeter.org` (production) + `widgets-preview.perimeter.org` or a `*.vercel.app` (preview).
2. **Vercel project: `apps/studio`**
   - Link the repo subdirectory `apps/studio` to a new Vercel project.
   - Domain: `studio.perimeter.org` (production) + preview.
3. **Vercel Blob store** (used by both apps)
   - Create one Blob store at the team level; bind to both projects.
   - Captured env vars: `BLOB_READ_WRITE_TOKEN`, `BLOB_PUBLIC_BASE_URL`.
4. **Upstash Redis store** (used by both apps)
   - Provision from the Vercel Marketplace; bind to both projects.
   - Captured env vars: `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
   - **If provisioning only exposes a raw `REDIS_URL`** and not the REST vars, follow `docs/superpowers/followups-2026-05-28.md` item #9 (write an Upstash-via-`ioredis` adapter); the current `getStore()` selector fails fast with a clear error pointing at this.
5. **Studio-only env vars**
   - `BETTER_AUTH_SECRET` — generate a random 32+ char value, set in Production and Preview separately (do not share between environments).
   - `BETTER_AUTH_URL` — `https://studio.perimeter.org` in Production; the preview URL in Preview.
   - `MP_API_BASEURL`, `MP_API_CLIENT`, `MP_API_SECRET` — pull from the helpdesk/metrics projects' env (same MP OAuth app is reusable).
6. **MP OAuth redirect URI**
   - Register `https://studio.perimeter.org/api/auth/callback/ministryplatform` with Ministry Platform.
   - Also register the preview-URL equivalent if previews need to test sign-in.
7. **DNS**
   - `widgets.perimeter.org` → CNAME to the Vercel project (per Vercel's domain wizard).
   - `studio.perimeter.org` → same.
   - **Until DNS resolves**, the cutover is blocked at this step.

**Gate A — go / no-go criteria:**
- `https://widgets.perimeter.org/manifest.json` returns `200` with body `{}` (empty manifest is valid).
- `https://studio.perimeter.org` returns the studio shell.
- `https://studio.perimeter.org/admin/login` renders the MP sign-in button.
- A locally-run `RELEASE_STORE_DRIVER=memory pnpm publish-widget sermons` still succeeds (regression check on the script itself).

**Rollback at Gate A:** No production state has changed. Take down the Vercel projects if needed; no DNS impact on legacy.

### B. First production publish

**Done by:** A developer with shell access, running `pnpm publish-widget sermons` locally from a clean clone with the prod env vars exported (one-time manual run).

**Prerequisite:** Decide on the first production version number for sermons. The current `package.json` reads `"version": "0.0.0"` from Phase 3, which is fine functionally but not meaningful. **Open question (1) below** — pending the version-bump decision, default to `1.0.0` on `main`.

Steps:

1. Check out `main` (the cutover release branch).
2. Bump `widgets/sermons/package.json` version (e.g. `0.0.0` → `1.0.0`).
3. Export the four prod env vars (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `BLOB_PUBLIC_BASE_URL`) in the shell.
4. Run `pnpm publish-widget sermons`.
5. Expected console output: `Published sermons@1.0.0 (<size> KB gz) — available, not yet live.`

**Gate B — go / no-go criteria:**
- The script exits 0 and prints the success line.
- `https://widgets.perimeter.org/sermons/1.0.0/index.js` returns `200` with `cache-control: public, max-age=31536000, immutable` and `content-type: application/javascript; charset=utf-8`.
- `https://widgets.perimeter.org/sermons/latest.js` returns `404` (no promote yet) with `cache-control: public, max-age=60`.
- `https://widgets.perimeter.org/manifest.json` returns `{}` (sermons isn't promoted yet, so it's not in the manifest).
- The studio activity log shows one `publish sermons@1.0.0 by script` entry (visible on `/admin/releases`).

**Rollback at Gate B:** A failed publish either left no records (script throws before `recordBuild`) or left a record but no live pointer (no users see anything). Either way, no production user impact. Investigate, fix, re-run.

### C. Studio admin sign-in + first promote

**Done by:** Repository owner.

Steps:

1. Sign in to `https://studio.perimeter.org/admin/login` with MP OAuth.
2. Land on `/admin/releases`.
3. The sermons panel lists one available build: `1.0.0`. No `LATEST` badge yet.
4. Click **Promote 1.0.0**.
5. Wait for the page to refresh (server action + `revalidatePath`).
6. The activity log gains a `promote sermons@1.0.0 by <email>` entry.

**Gate C — go / no-go criteria:**
- `https://widgets.perimeter.org/sermons/latest.js` now returns `302` with `location: /sermons/1.0.0/index.js` and `cache-control: public, s-maxage=300, stale-while-revalidate=86400`.
- `https://widgets.perimeter.org/manifest.json` now returns `{"sermons": "/sermons/latest.js"}`.
- A second copy of the `<script src="https://widgets.perimeter.org/sermons/latest.js" defer>` snippet, pasted into any test page, mounts the sermons widget successfully.
- The studio middleware redirects an unauthenticated `/admin/releases` request to `/admin/login` (sanity check of the auth gate).

**Rollback at Gate C:** The promote can be reversed with the same UI. Pick the prior (nonexistent) state by leaving the pointer empty — well, no, once promoted the pointer is non-null. Acceptable: the `latest.js` 302 is itself harmless (only the embed page would notice). If anything is wrong, click rollback against the same build to get a `rollback` activity entry, then deliberately un-promote by setting `latest:sermons` to `null` via a one-line `wrangler`-style script or directly in the Vercel KV dashboard. (Currently the UI has no "un-promote" button — see Open question 5.)

### D. Shadow-mode validation on staging WordPress

**Done by:** Web/WordPress maintainer.

Before flipping the live `<script src>`, embed the new widget on a non-public staging WordPress page or behind a feature flag visible only to the maintainer.

**Smoke matrix** — each row must be PASS before proceeding to Gate D:

| # | Check | Expected |
|---|---|---|
| 1 | Widget mounts and shows the sermon listing | Same data, same number of sermons, same default sort as legacy |
| 2 | Visual diff: side-by-side with the legacy widget | No noticeable layout/visual regressions |
| 3 | Filter URL bookmarks: apply a filter, copy URL, reload | Filters persist (Phase 3 follow-up #7 fix) |
| 4 | PDF transcript view | Renders without fetching from `unpkg.com` (Phase 3 follow-up #8 fix); no network request to `unpkg.com` visible in DevTools |
| 5 | CSP-strict embed: page with `Content-Security-Policy: script-src 'self' widgets.perimeter.org` | Widget loads; pdf.js worker runs (blob URL is same-origin per CSP rules) |
| 6 | Mobile responsive | Layout matches legacy on common breakpoints |
| 7 | Series detail view → sermon click → back navigation | URL state is consistent (`sermons-screen=detail`, etc.) |
| 8 | Audio player (sermon listening) | Plays through, can scrub, can adjust speed |
| 9 | Network audit (DevTools, Production tab) | Requests only to: `widgets.perimeter.org`, `api.perimeter.org`, the audio CDN (likely Sardius), and the host site. **NO requests to `unpkg.com`, `cdn.jsdelivr.net`, or any other unexpected origin.** |
| 10 | Cold-load bundle size | Sermons IIFE ~801 KB gz (matches the 850 KB budget; spec section in the umbrella doc) |
| 11 | Error reporting / sentry / browser console | No new errors that weren't present in the legacy widget |

**Gate D — go / no-go criteria:**
- All 11 smoke matrix rows pass.
- A test promote → rollback → promote cycle in studio works end-to-end (validates the rollback path on production infrastructure before we depend on it).
- The team responsible for monitoring (web maintainer + on-call) is briefed and ready.

**Rollback at Gate D:** Nothing in production has changed — only the staging page. Take down the staging embed, fix issues, re-do.

### E. WordPress flip in production

**Done by:** Web/WordPress maintainer, with the repository owner and the on-call/team-lead available.

**The single change:** in the WordPress theme or plugin that embeds the sermons widget, change the script src:

```html
<!-- before -->
<script src="https://cdn.jsdelivr.net/gh/perimeterchurch/.../legacy.js" defer></script>

<!-- after -->
<script src="https://widgets.perimeter.org/sermons/latest.js" defer></script>
```

If WordPress's update path is git-versioned (recommended): push the change to a feature branch, deploy to staging once more for a final sanity check, merge to main, deploy to production.

If WordPress is edited directly (legacy CMS workflow): make the change during a low-traffic window. Verify it took effect within 60 seconds.

**Define monitoring windows before flipping:**

- **First 5 minutes after flip:** owner+maintainer pair-watch DevTools on a fresh anonymous browser session loading the sermon page. Verify the widget loads, no console errors, page metrics look normal.
- **First 60 minutes:** check error-reporting tool (whichever is in use — Sentry, BrowserStack, etc.) for new error spikes filtered by the sermons page. If error rate exceeds 1.5× the prior-week baseline → trigger Gate E rollback.
- **First 24 hours:** check ad-hoc each ~6 hours. Compare CDN logs: `widgets.perimeter.org/sermons/latest.js` should see traffic that matches the prior-week `cdn.jsdelivr.net` traffic for the same path.

**Gate E — go / no-go criteria:**
- 1-hour error rate within 1.5× prior-week baseline.
- 24-hour traffic-shape (volume + geography) matches prior-week within ~10%.
- Zero P0/P1 issues reported by users (e.g. "the sermons page is broken").

**Rollback at Gate E** (this is the important one — bookmark this section in the runbook):
- **Trigger criteria:** error rate >2× baseline within 1 hour, OR any P0 user report, OR a clear breaking regression in the smoke matrix that wasn't caught in shadow mode.
- **Action:** revert the WordPress `<script src>` change. Same edit path that was used to make the flip.
- **Decision authority:** repository owner (`parkerb@perimeter.org`). On-call can flag, owner decides.
- **Time-to-rollback target:** <15 minutes from trigger.
- **Post-rollback:** the new widget infrastructure stays running (no need to depromote in studio — the legacy script is what WordPress is now pulling). Investigate, fix, re-do Gate D, re-attempt Gate E.

### F. jsDelivr retirement

**Done by:** Repository owner, only after **7 days minimum** of stable Gate E (i.e. one full week of production traffic on the new widget with no rollback events).

Steps:

1. **Disable the legacy build pipeline** in the legacy widget repository — turn off the build action that pushes to the path jsDelivr serves.
2. **Delete the committed `dist/` if any** to prevent accidental publish.
3. **Add a banner** to the legacy repo README pointing at the new repo and explaining the cutover date.
4. **Archive `legacy/v1` branch** in the new repo (`git update-ref refs/heads/legacy/v1-archived ...` and then delete `legacy/v1` if desired — preserve under a tag).
5. **Update `CLAUDE.md`** in the new repo: move "Phase 4 in progress" to "Phase 4 complete; production lives at `widgets.perimeter.org`."
6. **Audit CDN logs for one final week:** there should be zero hits to `cdn.jsdelivr.net/gh/perimeterchurch/.../legacy.js`. If non-zero, identify which embedders are still on the old URL (cached WordPress pages? other church sites?) and update them.

**Gate F — go / no-go criteria for declaring Phase 4 done:**
- Seven (7) days of zero traffic to legacy URL (per CDN logs or manual probe).
- All known consumers updated.
- `CLAUDE.md` updated.

After Gate F: Phase 4 is complete. The platform is in production. Future widget development lands directly via `pnpm publish-widget <name>` + `/admin/releases`.

## What changes in this repo for Phase 4

Minimal code changes. The bulk of the work is operational (provisioning + WordPress flip).

| File | Change |
|---|---|
| `widgets/sermons/package.json` | Version bump from `0.0.0` to `1.0.0` (or whichever is decided per Open question 1). |
| `CLAUDE.md` | Status block updated when each cutover phase lands. |
| `docs/superpowers/handoffs/` | Session handoff document(s) capturing the cutover runbook in real-time, like Phase 3 did. |

The Phase 4 plan that springs from this spec will be a checklist-style operational plan, not a code-heavy plan. Most of its tasks are "do X in the Vercel dashboard," "edit Y in WordPress," "watch Z dashboard for one hour."

## Out of scope (Phase 4)

- **GitHub Actions auto-publish on push to main.** Tracked separately in `docs/superpowers/followups-2026-05-28.md` item #2. Lands after the manual flow is proven on at least 1-2 production publishes.
- **The `loader.js` page-scan loader.** Tracked as item #1; defer until widget #2 exists.
- **Bundle optimization (move pdf.js worker to CDN with CORS, drop the inlined copy).** Tracked in the budget-bump commit on the cutover-blockers PR. Reclaims ~280 KB gz; do AFTER Phase 4 stabilizes, so we don't redeploy the widget during the cutover monitoring window.
- **Multi-instance sermons widgets on one page.** The Phase 3 follow-up #7 fix explicitly assumes one sermons instance per page. If a real use case appears, a separate widget type would be introduced (e.g. `widget-sermon-hero`).
- **Per-customer customization or campus-specific themes.** Same exclusion as the umbrella spec.

## Optimization tracked for after cutover

Once `widgets.perimeter.org` is live with stable traffic, the pdf.js worker can move OUT of the IIFE bundle:

1. Add a static asset path on the CDN: `apps/cdn/public/static/pdf-worker/pdf.worker-<version>.min.mjs` (file is committed; one-time copy from `node_modules/pdfjs-dist/build/`).
2. Configure CORS headers via `apps/cdn/next.config.ts`'s `headers()` for the static path: `Access-Control-Allow-Origin: *`.
3. Change `widgets/sermons/src/components/players/PdfViewer.tsx` from the `?raw` + blob-URL approach back to a URL-based `workerSrc` pointing at the new CDN path.
4. Re-run `pnpm publish-widget sermons` and promote. Bundle returns to ~512 KB gz; the 850 KB budget gets re-tightened to ~600 KB.

This is a Phase 4-adjacent optimization, not a Phase 4 deliverable. Doing it during Phase 4 risks rolling a new bundle in the middle of cutover monitoring; doing it before Phase 4 has the same problem inverted (we'd be flipping infrastructure during the same week as the cutover). Defer.

## Risks specific to Phase 4

| Risk | Mitigation |
|---|---|
| Vercel Blob or KV provisioning is harder than expected (Marketplace surface changes; team permissions) | Gate A blocks Phase 4 until fully provisioned. Acceptable to slip the schedule; nothing in production has changed. |
| The first prod `publish-widget` run reveals a bug only present under real env vars (e.g. CORS, IAM token shape) | The script runs locally with the dev's shell. Fail-fast errors from `getStore()` already point at the actual env var missing or malformed. Plan: dev iterates on env config in their shell before pushing to Vercel. |
| MP OAuth callback fails on production studio URL | Test sign-in completes during Gate C BEFORE we trust the admin UI for the promote. If it fails, `BETTER_AUTH_*` env vars are the first check. |
| WordPress flip causes a cache regression (the embed page is heavily cached and old `<script>` survives in user browser cache for hours) | The `<script src>` URL change is a different URL, so browser cache CANNOT confuse the two scripts. WordPress page cache might serve the old `<script>` tag — confirm WordPress's caching layer (Cloudflare? Varnish?) is purged after the flip. |
| Bookmarkable URLs regress for users who bookmarked the legacy widget's URL shape | The legacy widget's filter URL shape is `?<some-param>=`. The new widget uses `?sermons-<key>=`. Users with bookmarked legacy URLs will land on the page without their filters applied. This is acknowledged degradation — not a regression of bookmarkable URLs going forward (which was the actual Phase 4 goal). |
| Promote/rollback races during the cutover (e.g. two admins promote at the same time) | The store's `setLatest` is read-modify-write with no transaction. Activity log entries record both actions; the last write wins. Mitigation: coordinate during cutover so only one admin is acting. |
| Need to roll back the WordPress flip but `widgets.perimeter.org` is already serving the bundle, so reverting WordPress alone doesn't help anyone whose page cache served the new script tag | Rolling back the WordPress edit DOES still help — the next page load picks up the legacy URL, the legacy widget JS comes from cdn.jsdelivr.net, and users who already have the new widget's JS cached just get nothing new. Worst case: full page refresh on the user's side. Document this nuance in the runbook. |
| jsDelivr cache reuse — even after WordPress edits, old script tag URLs can stick in user browser caches | Vercel's `Cache-Control` on `latest.js` is `s-maxage=300` (5 minutes), but BROWSER caches respect a different policy. A user with an old cached `<script>` tag will keep using `cdn.jsdelivr.net` until the page is reloaded with cache-bust. Acceptable: this is identical to how the legacy system already behaves. |

## Success criteria (Phase 4 done)

1. WordPress sermons embed loads from `widgets.perimeter.org/sermons/latest.js`.
2. No requests to `cdn.jsdelivr.net/gh/perimeterchurch/.../legacy.js` for 7 consecutive days.
3. Error rate within 1.0× prior-week baseline (i.e. matching legacy).
4. Studio admin can promote/rollback at will; activity log is auditable.
5. `pnpm publish-widget sermons` succeeds against prod infrastructure (one human-run cycle proves the flow; Phase 4 follow-ups land GitHub Actions automation).
6. `CLAUDE.md` Status section reflects "Phase 4 complete."
7. The legacy widget repo is archived; `legacy/v1` branch has a deprecation notice.

## Open questions

These need answers before Phase 4 starts. Each is a discrete decision; none blocks drafting the implementation plan.

1. **Sermons version bump for the first prod publish.** Currently `widgets/sermons/package.json` is `0.0.0`. Options: jump straight to `1.0.0` (clean cutover semantic), match the legacy widget's last known version (continuity), or pick something else. **Recommendation:** `1.0.0` — the rebuild is a meaningful breaking change vs legacy, even if the user-facing widget looks the same.

2. **WordPress staging instance for Gate D.** Does one exist? If not, the smoke matrix has to run on a feature-flagged page in production, or on a separately-spun-up WP instance. **Pending input.**

3. **Decision authority for Gate E rollback.** Default is repository owner. Is there a secondary authority for off-hours scenarios? **Pending input.**

4. **Parallel running vs hard flip.** Should we keep jsDelivr live for some grace period after Gate E (e.g. 30 days as a fallback if anything is wrong)? Or is a hard flip + monitoring sufficient? **Recommendation:** keep jsDelivr live for the 7-day Gate F window. After that, retire. (Gives us a rollback path that doesn't require redeploying anything; just reverting the WordPress edit.)

5. **Un-promote button in studio.** The current admin UI has Promote and Roll back to (an older build); it does NOT have "un-promote entirely so /latest.js returns 404 again." Mostly an edge case (would only matter if we promote a build that turns out to be broken AND we don't have an older version to roll back to). **Recommendation:** add it as a small Phase 4 task IF the cutover validation reveals this scenario is plausible; otherwise, defer indefinitely.

6. **CORS configuration on `widgets.perimeter.org`.** The route handlers don't set `Access-Control-Allow-Origin`. The bundle `<script src>` doesn't require CORS (script tags are exempt). But future use cases (e.g. fetching the manifest from JavaScript) would. **Recommendation:** add `Access-Control-Allow-Origin: *` to all CDN responses via `apps/cdn/next.config.ts`'s `headers()` config; trivial, no downside.

7. **Analytics on widget loads.** Today, jsDelivr provides traffic stats. After cutover, Vercel provides logs but the analytics shape may differ. Do we need a custom usage-tracking shim? **Recommendation:** Vercel logs are sufficient for the Gate E/F traffic compare. No new analytics infrastructure for Phase 4.
