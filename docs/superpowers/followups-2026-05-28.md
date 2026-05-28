# Phase 3 Follow-ups (2026-05-28)

Captured after the Phase 3 rebuild PR (#50) was opened. Each item below is a discrete piece of work surfaced during code review or explicitly deferred by the Phase 3 plan. Items are grouped by ordering recommendation.

For the open PR these were collected against, see `docs/superpowers/plans/2026-05-27-perimeter-widgets-phase-3-hosting-release.md` "Out of scope" plus the per-task code-quality review notes.

---

## Recommended ordering

1. **Production-hardening pass** — #4 + #5 + #6 (one small PR, no design questions)
2. **Cutover blockers** — #7 + #8 (#7 needs a UX decision first)
3. **Phase 4 cutover** — #3 (pulls in 4–8 as prerequisites)
4. **Operational follow-ups** — #2 then #1 (after cutover)
5. **Opportunistic** — #9, #10 (no pre-planning)

---

## Items

### 1. `loader.js` — global page-scan loader

**What:** One script that consumers drop into `<head>` once; it scans the page for `<div data-widget="<name>">` and mounts the matching widget bundle automatically. Replaces hand-writing a separate `<script src=".../<name>/latest.js">` per widget instance.

**Why it matters:** Removes per-widget integration friction; makes adding the next widget a config change instead of a copy-paste exercise for every consumer.

**Scope:** Small. New `@perimeter/loader` package, new route on the CDN to serve it (`/loader.js`), Vite plugin to bundle it as an IIFE.

**Dependencies:** None. But this is premature until widget #2 exists — the plan explicitly defers it.

**Recommendation:** Defer until widget #2.

### 2. GitHub Actions automation for `pnpm publish-widget`

**What:** On push to `main` (or on tag), trigger `pnpm publish-widget <name>` for each widget that changed (or every widget). Eliminates the manual "remember to publish locally before announcing the release" step.

**Why it matters:** Publishing today is a manual local command. Fine for one developer but doesn't scale and risks "I forgot to publish."

**Scope:** Small. One workflow file at `.github/workflows/publish-widget.yml`; the four prod env vars wired in as GitHub repo secrets (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `BLOB_PUBLIC_BASE_URL`).

**Dependencies:** Vercel resources provisioned first (item 3 prerequisite).

**Recommendation:** Land after Phase 4 cutover. Manual publish is fine in the interim.

### 3. WordPress cutover + jsDelivr retirement

**What:** Flip the WordPress embeds from `https://cdn.jsdelivr.net/gh/perimeterchurch/.../legacy.js` to `https://widgets.perimeter.org/sermons/latest.js`. Validate against legacy metrics. Then disable the jsDelivr pipeline (delete the legacy build target, archive `legacy/v1`).

**Why it matters:** This is the actual production launch of Phase 3. Without it, all the new infrastructure is dark.

**Scope:** Medium. The WordPress flip itself is one line; validation (compare load metrics + error rates + URL params + mobile vs desktop) is what takes time. Plus a rollback plan in case the legacy widget needs to come back fast.

**Dependencies:** Items #7 and #8 MUST land first (otherwise behavior regresses vs legacy on bookmarkable URLs and on worker isolation). Item #4 should land first to avoid a 404-cache surprise during validation.

**Recommendation:** The headline goal of Phase 4. Plan order: items #7 + #8 → preview deploy → A/B validate against legacy → flip WordPress → monitor for N days → retire jsDelivr.

### 4. Uniform `cache-control` policy on CDN 404 responses

**What:** All four CDN route handlers currently return `new Response('not found', { status: 404 })` with no `cache-control` header. Without one, Vercel's edge applies a default — could cache a 404 long enough that a freshly-promoted widget appears broken to users hitting cached 404s.

**Why it matters:** Eliminates a known sharp edge before cutover. The risk window is the minutes between `pnpm publish-widget` and `promote` — currently any client hitting the bundle URL during that window could get a 404 cached for an indeterminate TTL.

**Scope:** ~4-line touch-ups across `apps/cdn/src/app/api/*/route.ts`, one new constant in `src/lib/cache.ts` (e.g. `NOT_FOUND_CACHE = 'public, max-age=60'`), update existing tests to assert the new header.

**Dependencies:** None.

**Recommendation:** Bundle into the production-hardening pass (with #5 and #6). 30 minutes of work.

### 5. Middleware matcher gap (`/admin` bare path)

**What:** Current matcher `'/admin/((?!login).*)'` requires at least one character after `/admin/`. A request to `/admin` (no trailing slash) is NOT gated. `apps/studio/src/app/admin/page.tsx` would render to unauthenticated visitors.

**Why it matters:** Exposure today is low (the admin landing page is just a `<Link>` to `/admin/releases` and an `<h1>`; following the link triggers middleware → redirect). But it contradicts the stated "gate `/admin/*`" intent and any future content added to `admin/page.tsx` would unexpectedly leak.

**Scope:** One-character fix: `matcher: ['/admin', '/admin/((?!login).*)']`. Add a middleware test case covering the bare path.

**Dependencies:** None.

**Recommendation:** Bundle into the hardening pass.

### 6. Gitignore the auto-generated `next-env.d.ts` files

**What:** Next.js auto-generates `apps/studio/next-env.d.ts` (and now `apps/cdn/next-env.d.ts`); the contents change between `next dev` (`.next/dev/types/...`) and `next build` (`.next/types/...`). Currently the file is tracked; every dev↔build flip produces a phantom commit diff.

**Why it matters:** Spurious diffs on PRs from teammates whose last `next` command differs. Pure noise.

**Scope:** Tiny. Add `apps/studio/next-env.d.ts` and `apps/cdn/next-env.d.ts` to the appropriate `.gitignore`, then `git rm --cached` both. CI must run `next build` (or `next dev`) once before typecheck so the file regenerates — already happens today via `pnpm build` in the quality pipeline.

**Dependencies:** None.

**Recommendation:** Bundle into the hardening pass.

### 7. Stable nuqs URL prefix on the sermons widget

**What:** `widgets/sermons/src/App.tsx:37` uses a per-mount `randomUUID()` to scope nuqs query params — fine for multiple widget instances on one page, but each page load gets a fresh prefix, so bookmarkable filter URLs (`?sermons-abc123-q=jesus`) become noise after a reload.

**Why it matters:** The legacy sermons widget supports bookmarkable URLs. Cutover (item #3) is a UX regression without this.

**Scope:** Small but design-sensitive. Two design directions:
- **Static prefix `sermons-`:** simple, breaks bookmarkable URLs if two sermons widgets coexist on one page (param collisions). Acceptable if we declare "one sermons widget per page."
- **Stable hash of mount-root `id`:** unique per instance AND stable across reloads. Requires consumers to set an `id` attribute on the mount `<div>`. Document the requirement in the embed snippet.

**Dependencies:** None code-wise. Needs the UX/design decision on the multi-instance trade-off.

**Recommendation:** Real Phase 4 cutover blocker. Start with the design question, then implement.

### 8. Self-host the pdf.js worker

**What:** `widgets/sermons/src/components/players/PdfViewer.tsx:23` loads the pdf.js worker from `https://unpkg.com/pdfjs-dist@.../build/pdf.worker.min.mjs`. Three issues at production scale:
- External runtime dependency on an unrelated CDN
- No version pinning to the locally-installed `pdfjs-dist` (drift risk)
- Hostile to any consumer that locks `script-src` via CSP

**Why it matters:** Cutover (#3) brings real production traffic. unpkg outage = sermon-PDF features dead; CSP rejection = same.

**Scope:** Small. Two options:
- **Bundle the worker via Vite plugin:** ship as part of the widget IIFE. `pdfjs-dist` provides the worker as a separate module; the plugin already has plumbing for asset emit.
- **Copy to a static path under `widgets.perimeter.org/static/pdf.worker.<hash>.js`:** version-pinned via filename hash. Set `GlobalWorkerOptions.workerSrc` to this URL.

The bundled-worker option avoids any new CDN routes. The hosted-worker option leverages the CDN's existing immutable cache headers and is symmetric with how widget bundles are served.

**Dependencies:** None. Easier to host on `widgets.perimeter.org` once cutover (#3) is moving anyway, but doable pre-cutover.

**Recommendation:** Real Phase 4 cutover blocker. Pair with #7 in design + implementation.

### 9. Vercel/Upstash `REDIS_URL`-only adapter

**What:** `getStore()` requires `KV_REST_API_URL` + `KV_REST_API_TOKEN`. If a future Marketplace store provisioning only exposes a raw `REDIS_URL`, we'd need an adapter — `@upstash/redis` speaks REST, NOT raw Redis protocol, so we'd need `ioredis` or similar.

**Why it matters:** Insurance against a provisioning surprise. Current `getStore()` throws a clear error pointing at this (the Chunk 2 implementation deliberately fails loudly rather than guessing).

**Scope:** Unknown until we see Marketplace provisioning output. Could be zero work (REST vars are exposed as expected) or a small adapter (one new driver function in `packages/release-store/src/drivers/`).

**Dependencies:** Provisioning step from item #3.

**Recommendation:** Don't pre-plan. Address only if provisioning reveals it's needed.

### 10. `middleware.ts` → `proxy.ts` file convention rename

**What:** Next 16 emits a deprecation warning suggesting `middleware.ts` rename to `proxy.ts`. Informational only — current code works fine.

**Why it matters:** Future Next.js version may remove `middleware.ts` support. Cheap upgrade path now.

**Scope:** Trivial. Rename file. Check whether the `matcher` config syntax changed (probably not — `proxy.ts` is described as a strict rename).

**Dependencies:** None.

**Recommendation:** Defer. The deprecation isn't on a removal timeline; rename opportunistically when other middleware work is happening.

---

## Tracking

This document is the source of truth for these items until they're resolved or filed as GitHub issues. As each item lands, mark it in this file (or remove the section) and reference the merging PR.
