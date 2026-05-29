# Perimeter Widgets — Phase 4: Production Cutover Design

**Status:** Approved (open questions resolved 2026-05-29)
**Date:** 2026-05-28
**Author:** parkerb@perimeter.org (with Claude)
**Umbrella:** `2026-05-22-perimeter-widgets-rebuild-design.md`
**Prior phase:** `2026-05-27-perimeter-widgets-phase-3-hosting-release-design.md`

## Goal

Stand up `widgets.perimeter.org` as the production widget CDN, publish + promote the first version of `@perimeter/widget-sermons` (`1.0.0`), point WordPress sermon embeds at `widgets.perimeter.org/sermons/latest.js`, and retire the dormant jsDelivr build pipeline. After this phase, **the new platform is what serves production**, the `legacy/v1` branch is archived, and there is no dev/prod skew on the widget rendering path.

This is the operational phase, not a code phase. The infrastructure (`@perimeter/release-store`, `apps/cdn`, `apps/studio`, `pnpm publish-widget`) all exist as of Phase 3. What's missing is everything between "the code works locally" and "WordPress users see the new widget."

> **Note on framing:** jsDelivr is NOT currently serving live widgets — the legacy embed pipeline exists in source but no WordPress page points at it today. Phase 4 is therefore a **first production launch**, not a "flip" from a live legacy system. There is no prior-week baseline to compare against, no parallel-running period, and no fallback to a working legacy widget if something goes wrong. The risk profile is "deploy new infrastructure to production" rather than "swap a working production system for a new one." This matters in Gate E and Gate F below.

## Decisions resolved during review

| # | Decision | Rationale |
|---|---|---|
| 1 | First production sermons version is `1.0.0` | Bumped from `0.0.0`; rebuild is a meaningful breaking change vs the dormant legacy code |
| 2 | Smoke-matrix validation runs on a private (unpublished) page on production WordPress | No staging WordPress instance exists; private page is sufficient because the public-facing pages remain on whatever they're on (no jsDelivr traffic) |
| 3 | Rollback decision authority is repository owner only | No secondary off-hours authority; if the owner is unavailable, rollback waits |
| 4 | Hard cut from jsDelivr at the same time as the flip — no parallel-running period | jsDelivr isn't currently serving any live widgets; there is no fallback to preserve |
| 5 | Un-promote button in studio admin is deferred indefinitely | Edge case; rollback to an earlier version covers the realistic cases |
| 6 | `apps/cdn` will set `Access-Control-Allow-Origin: *` on all responses via `next.config.ts`'s `headers()` | Trivial, no downside, unblocks any future client-side fetches of `manifest.json` |
| 7 | Vercel CDN logs are sufficient for Phase 4 traffic monitoring | No new analytics infrastructure needed |

## Non-goals for Phase 4

- Building new widgets. Sermons is the only production widget; #2 ships on the existing platform.
- GitHub Actions auto-publish — the publish-widget script runs manually for the first release. Automation lands as a Phase 4 follow-up once we know the manual flow is correct.
- The `loader.js` global page-scan script — defer until the second widget exists.
- Bundle-size optimization to take pdf.js back out of the IIFE (tracked separately; see "Optimization tracked for after cutover" below).

## Cutover phases

Phase 4 is a sequence of irreversible-ish steps separated by validation gates. The structure is deliberate: every gate has a clearly defined "go / no-go" condition and an explicit rollback path. The sequence is:

```
A. Provision Vercel resources (Blob + Redis + env vars + DNS + CORS headers)
       ↓ validate: bootstrap a memory-driver publish; spot-check creds; manifest.json reachable
B. First production publish (pnpm publish-widget sermons@1.0.0 against prod store)
       ↓ validate: ledger entry, bundle blob, no `latest` pointer
C. Studio admin sign-in + first promote
       ↓ validate: /sermons/latest.js 302s to /sermons/1.0.0/index.js;
         manifest.json reflects the promotion
D. Private-page validation on production WordPress
       ↓ validate: 11-row smoke matrix passes
E. Production embed (public WordPress)
       ↓ validate: widget loads on the public sermons page; no console errors;
         CDN logs show traffic shaped as expected
F. jsDelivr build pipeline retirement + legacy/v1 archive
       ↓ validate: legacy build action disabled; legacy/v1 tagged; CLAUDE.md updated
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
8. **CORS headers on `apps/cdn`** (decision 6)
   - Update `apps/cdn/next.config.ts` to add a `headers()` function that sets `Access-Control-Allow-Origin: *` on all `/api/*` and rewritten paths.
   - Verify by running `curl -i https://widgets.perimeter.org/manifest.json` from a non-browser context and confirming the header is present.

**Gate A — go / no-go criteria:**
- `https://widgets.perimeter.org/manifest.json` returns `200` with body `{}` (empty manifest is valid) AND `Access-Control-Allow-Origin: *`.
- `https://studio.perimeter.org` returns the studio shell.
- `https://studio.perimeter.org/admin/login` renders the MP sign-in button.
- A locally-run `RELEASE_STORE_DRIVER=memory pnpm publish-widget sermons` still succeeds (regression check on the script itself).

**Rollback at Gate A:** No production state has changed. Take down the Vercel projects if needed; no DNS impact on legacy.

### B. First production publish

**Done by:** A developer with shell access, running `pnpm publish-widget sermons` locally from a clean clone with the prod env vars exported (one-time manual run).

**Prerequisite:** `widgets/sermons/package.json` version bumped from `0.0.0` to `1.0.0` (decision 1). This bump should be its own commit on the cutover branch BEFORE the first publish.

Steps:

1. Check out `main` (the cutover release branch).
2. Bump `widgets/sermons/package.json` version from `0.0.0` to `1.0.0`.
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

### D. Private-page validation on production WordPress

**Done by:** Web/WordPress maintainer.

Embed the new widget on a private (unpublished/draft/password-protected) page on the production WordPress instance — no separate staging WP exists (decision 2). The production site continues to serve whatever it currently serves; this private page is only visible to the maintainer.

**Smoke matrix** — each row must be PASS before proceeding to Gate D:

| # | Check | Expected |
|---|---|---|
| 1 | Widget mounts and shows the sermon listing | Renders sermons from `api.perimeter.org`; default sort applied |
| 2 | Visual review | Layout looks correct on the embedded page; no broken styles |
| 3 | Filter URL bookmarks: apply a filter, copy URL, reload | Filters persist (Phase 3 follow-up #7 fix) |
| 4 | PDF transcript view | Renders without fetching from `unpkg.com` (Phase 3 follow-up #8 fix); no network request to `unpkg.com` visible in DevTools |
| 5 | CSP-strict embed: page with `Content-Security-Policy: script-src 'self' widgets.perimeter.org` | Widget loads; pdf.js worker runs (blob URL is same-origin per CSP rules) |
| 6 | Mobile responsive | Layout works on common breakpoints |
| 7 | Series detail view → sermon click → back navigation | URL state is consistent (`sermons-screen=detail`, etc.) |
| 8 | Audio player (sermon listening) | Plays through, can scrub, can adjust speed |
| 9 | Network audit (DevTools, Production tab) | Requests only to: `widgets.perimeter.org`, `api.perimeter.org`, the audio CDN (likely Sardius), and the host site. **NO requests to `unpkg.com`, `cdn.jsdelivr.net`, or any other unexpected origin.** |
| 10 | Cold-load bundle size | Sermons IIFE ~801 KB gz (matches the 850 KB budget; spec section in the umbrella doc) |
| 11 | Browser console | No errors, no warnings beyond expected React dev/prod messaging |

**Gate D — go / no-go criteria:**
- All 11 smoke matrix rows pass.
- A test promote → rollback → promote cycle in studio works end-to-end (validates the rollback path on production infrastructure before we depend on it).
- The owner (per decision 3) is available to make the Gate E call.

**Rollback at Gate D:** Nothing public has changed — only the private page. Take down the private embed, fix issues, re-do.

### E. Production embed on public WordPress

**Done by:** Web/WordPress maintainer, with the repository owner (decision 3) available.

**The single change:** in the WordPress theme or plugin, add the script tag to the public sermons page:

```html
<script src="https://widgets.perimeter.org/sermons/latest.js" defer></script>
```

Because jsDelivr isn't currently serving live traffic (decision 4), this is a **first production deploy**, not a swap. There is no prior URL to "flip from" on the public page.

**Define monitoring windows before deploying:**

- **First 5 minutes:** owner+maintainer pair-watch DevTools on a fresh anonymous browser session loading the public sermon page. Verify the widget loads, no console errors, the listing renders with real sermon data.
- **First 60 minutes:** check Vercel CDN logs (`widgets.perimeter.org/sermons/latest.js` traffic) and browser-reported errors. If anyone reports the page is broken → trigger Gate E rollback.
- **First 24 hours:** check ad-hoc each ~6 hours. Vercel logs should show steady traffic shape matching general public sermon-page visit rates.

**Gate E — go / no-go criteria:**
- Widget loads on the public sermons page; no console errors.
- Vercel CDN logs show traffic for `widgets.perimeter.org/sermons/latest.js` that broadly matches WordPress sermon-page visit rates (sanity check: if WordPress sees 1000 sermon-page views and the CDN saw 5 widget loads, something is misconfigured).
- Zero P0 issues reported by users.

**Rollback at Gate E** (bookmark this section in the runbook):
- **Trigger criteria:** any P0 user report (e.g. "the sermons page is completely broken"), OR a clear breaking regression discovered post-deploy.
- **Action:** remove the `<script src="https://widgets.perimeter.org/sermons/latest.js">` tag from the WordPress page. The page reverts to whatever it was showing before Gate E (no sermons widget OR the dormant legacy widget if it had been left in HTML; verify before flipping).
- **Decision authority:** repository owner (`parkerb@perimeter.org`) only (decision 3). If owner is unavailable, rollback waits — accepted trade-off given low-stakes first launch and no live-legacy fallback to compare against.
- **Time-to-rollback target:** <15 minutes from trigger.
- **Post-rollback:** the new widget infrastructure stays running. Investigate, fix, re-do Gate D, re-attempt Gate E.

### F. jsDelivr build pipeline retirement + legacy archive

**Done by:** Repository owner, **immediately after Gate E** (decision 4 — no parallel-running period; jsDelivr was never live so there is no traffic to wait out).

Steps:

1. **Disable the legacy build pipeline** in the legacy widget repository — turn off any build action that pushes to the path jsDelivr would serve.
2. **Delete the committed `dist/` if any** to prevent accidental publish.
3. **Add a banner** to the legacy repo README pointing at the new repo and explaining the cutover date.
4. **Tag the `legacy/v1` branch** in the new repo (e.g. `git tag legacy/v1-archived legacy/v1`); optionally delete the branch after the tag exists. Preserve under a tag for git-history archaeology.
5. **Update `CLAUDE.md`** in the new repo: move "Phase 4 in progress" to "Phase 4 complete; production lives at `widgets.perimeter.org`."

**Gate F — go / no-go criteria for declaring Phase 4 done:**
- Legacy build pipeline disabled.
- `legacy/v1` archived under a tag.
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
| Vercel Blob or KV provisioning is harder than expected (Marketplace surface changes; team permissions) | Gate A blocks Phase 4 until fully provisioned. Acceptable to slip the schedule; nothing public has changed. |
| The first prod `publish-widget` run reveals a bug only present under real env vars (e.g. CORS, IAM token shape) | The script runs locally with the dev's shell. Fail-fast errors from `getStore()` already point at the actual env var missing or malformed. Plan: dev iterates on env config in their shell before pushing to Vercel. |
| MP OAuth callback fails on production studio URL | Test sign-in completes during Gate C BEFORE we trust the admin UI for the promote. If it fails, `BETTER_AUTH_*` env vars are the first check. |
| WordPress page cache layer (Cloudflare? Varnish?) serves the old page HTML without the new `<script>` tag after Gate E | Purge the WordPress page cache after editing. Verify by hitting the page in a fresh incognito window within 60 seconds of the edit. |
| Promote/rollback races during Phase 4 operations | The store's `setLatest` is read-modify-write with no transaction. Activity log entries record both actions; the last write wins. Mitigation: only the owner operates studio admin during cutover. |
| **No live-legacy fallback if Gate E reveals a problem** | This is the substantial risk of decision 4. There is no working legacy widget to roll back to — rollback removes the widget entirely from the public page. Acceptable trade-off because (a) the sermons page can survive without an embedded widget for the duration of a fix, (b) Gate D's smoke matrix on a real WordPress page is meant to catch the realistic failure modes before Gate E, (c) staging on production-but-private WordPress means there is no environmental drift between staging and prod. |
| Owner unavailable during a Gate E issue | Per decision 3, rollback waits. The blast radius is limited: the page either shows no widget or shows broken content depending on the failure mode. Document a maintenance message that the web maintainer can put on the page if owner is unreachable for >2 hours. |

## Success criteria (Phase 4 done)

1. WordPress sermons embed loads from `widgets.perimeter.org/sermons/latest.js`.
2. Studio admin can promote/rollback at will; activity log is auditable.
3. `pnpm publish-widget sermons` succeeds against prod infrastructure (one human-run cycle proves the flow; Phase 4 follow-ups land GitHub Actions automation).
4. `CLAUDE.md` Status section reflects "Phase 4 complete."
5. Legacy build pipeline is disabled; `legacy/v1` is tagged.
6. CORS header `Access-Control-Allow-Origin: *` is verified on `widgets.perimeter.org` responses.
