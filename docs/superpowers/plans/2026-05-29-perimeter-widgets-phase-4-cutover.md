# Perimeter Widgets — Phase 4: Production Cutover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Many tasks in this plan are operational (Vercel dashboard, WordPress edits, MP OAuth registration) — agents will execute code tasks directly but must hand operational tasks to a named human operator and verify their output.

**Goal:** Stand up `widgets.perimeter.org` as the production widget CDN, publish + promote `@perimeter/widget-sermons@1.0.0`, embed the new widget on the public WordPress sermons page, and retire the dormant jsDelivr build pipeline. After Phase 4, the new platform serves production.

**Architecture:** Operational rollout with minimal code changes. The two code touchpoints are a sermons version bump (`0.0.0` → `1.0.0`) and adding CORS headers to `apps/cdn` via Next.js's `next.config.ts` `headers()` config. The remaining ~80% of the plan is provisioning, env config, validation gates, and operator checklists. There is **no live jsDelivr traffic to compare against** — Phase 4 is a first production launch, not a swap from a working legacy system, so rollback removes the widget rather than reverts to legacy.

**Tech Stack:** pnpm 10 + Turborepo, Next.js 16 (App Router, route handlers), `@upstash/redis`, `@vercel/blob`, Better Auth (`genericOAuth` MP provider), vitest.

**Spec:** `docs/superpowers/specs/2026-05-28-perimeter-widgets-phase-4-cutover-design.md`

---

## Conventions (read before any task)

- Branch for the code parts of this plan: `feat/widgets-phase-4-cutover` (off `dev`). Never push to `dev` or `main` directly.
- Conventional commits — match the established style (`feat:`, `fix:`, `chore:`, `docs:`).
- Commit message bodies via heredoc + `git commit -F -`, never `-m` for multi-line.
- All commits in this plan should include the `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` footer per session standing practice.
- Run a single package's tests with `pnpm --filter <pkg> test`. Repo gate: `pnpm quality`.
- Operator tasks (Vercel dashboard, WordPress, MP OAuth) are flagged inline with `**Operator:**`. Agents executing this plan should pause at those steps and surface the work to the named human.
- For each Gate (A–F), the spec at `docs/superpowers/specs/2026-05-28-perimeter-widgets-phase-4-cutover-design.md` defines the go/no-go criteria. This plan adds the executable steps to reach each gate; the spec adds the criteria. Read both.

---

## File Structure

```
apps/cdn/
  next.config.ts                   MODIFY: wire corsHeaders() into the headers() async config
  src/lib/cors.ts                  NEW: pure function returning the Next headers() shape with Access-Control-Allow-Origin: *
  tests/cors.test.ts               NEW: unit-tests corsHeaders() returns the expected shape

widgets/sermons/
  package.json                     MODIFY: version 0.0.0 → 1.0.0

CLAUDE.md                          MODIFY: Status block at Gate F (Phase 4 complete)
```

That is the entire code surface for Phase 4. Everything else is in the Vercel dashboard, WordPress, or MP.

---

## Chunk 1: Pre-flight code changes

Two small code changes prepare the production environment before any provisioning. These can land before Gate A.

### Task 1: Add CORS headers to apps/cdn

**Files:**
- Create: `apps/cdn/src/lib/cors.ts`
- Create: `apps/cdn/tests/cors.test.ts`
- Modify: `apps/cdn/next.config.ts`

- [ ] **Step 1: Write the failing test** (`apps/cdn/tests/cors.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { corsHeaders } from '@/lib/cors';

describe('corsHeaders', () => {
  it('returns a Next.js headers() entry that allows any origin for all paths', async () => {
    const entries = await corsHeaders();
    expect(entries).toEqual([
      {
        source: '/(.*)',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @perimeter/cdn test tests/cors.test.ts`
Expected: FAIL — `Cannot find module '@/lib/cors'`.

- [ ] **Step 3: Write the impl** (`apps/cdn/src/lib/cors.ts`)

```ts
import type { NextConfig } from 'next';

type HeaderEntry = NonNullable<Awaited<ReturnType<NonNullable<NextConfig['headers']>>>>[number];

export async function corsHeaders(): Promise<HeaderEntry[]> {
  return [
    {
      source: '/(.*)',
      headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
    },
  ];
}
```

- [ ] **Step 4: Wire it into `next.config.ts`**

Edit `apps/cdn/next.config.ts` to import and call `corsHeaders` as the `headers()` async config:

```ts
import type { NextConfig } from 'next';
import { corsHeaders } from './src/lib/cors';

const config: NextConfig = {
  async rewrites() {
    return [
      { source: '/:name/:version/index.js.map', destination: '/api/bundle-map/:name/:version' },
      { source: '/:name/:version/index.js', destination: '/api/bundle/:name/:version' },
      { source: '/:name/latest.js', destination: '/api/latest/:name' },
      { source: '/manifest.json', destination: '/api/manifest' },
    ];
  },
  headers: corsHeaders,
};

export default config;
```

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm --filter @perimeter/cdn test`
Expected: all existing cdn tests plus the new CORS test pass. The CORS test count should appear as `corsHeaders` describe-block → 1 case under `tests/cors.test.ts`; the rest of the suite is unchanged.

- [ ] **Step 6: Verify the build is still happy**

Run: `pnpm --filter @perimeter/cdn typecheck && pnpm --filter @perimeter/cdn lint && pnpm --filter @perimeter/cdn build`
Expected: all exit 0. The build output should list all four routes plus `/api/auth/...` if applicable, with no warnings about the new headers config.

- [ ] **Step 7: Commit**

```bash
git commit -F - <<'EOF'
feat(cdn): allow CORS from any origin for widgets.perimeter.org

Adds Access-Control-Allow-Origin: * via next.config.ts headers() so that
client-side fetches of /manifest.json (and any future client-fetched route)
work from any embed origin. Script-tag loads of /latest.js are unaffected
(script tags are exempt from CORS). The headers() function is extracted to
src/lib/cors.ts and unit-tested.

Per Phase 4 design spec decision 6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
```

### Task 2: Bump sermons version to 1.0.0

**Files:**
- Modify: `widgets/sermons/package.json`

- [ ] **Step 1: Edit `widgets/sermons/package.json`**

Change the `"version"` field from `"0.0.0"` to `"1.0.0"`.

- [ ] **Step 2: Verify no unintended side effects**

Run: `pnpm --filter @perimeter/widget-sermons test`
Expected: 84/84 tests pass. The bundle test (`tests/bundle.test.ts`) asserts the bundle contains the version string — confirm it now contains `1.0.0`.

Run: `pnpm --filter @perimeter/widget-sermons build`
Expected: the built `dist/sermons/sermons.iife.js` includes the literal string `1.0.0` (verify with `grep -c "1.0.0" dist/sermons/sermons.iife.js`).

- [ ] **Step 3: Commit**

```bash
git commit -F - <<'EOF'
chore(widget-sermons): bump version 0.0.0 → 1.0.0 for first prod release

Per Phase 4 design spec decision 1. The rebuild is a meaningful breaking
change vs the dormant legacy code, so the first production publish lands
as 1.0.0 rather than continuing 0.0.x or matching legacy's last version.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
```

### Task 3: Open the code-changes PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/widgets-phase-4-cutover
```

- [ ] **Step 2: Open the PR**

Title: `feat(widgets): Phase 4 pre-flight (CORS + sermons 1.0.0)`. Write the PR body to a temp file via the Write tool, then:

```bash
gh pr create --base dev --head feat/widgets-phase-4-cutover --body-file <path>
```

PR body should include:
- Summary: two prep changes from the Phase 4 spec (CORS via `next.config.ts headers()`, sermons version bump)
- Test plan: `pnpm quality` green; bundle contains `1.0.0`
- Reference: spec `docs/superpowers/specs/2026-05-28-perimeter-widgets-phase-4-cutover-design.md` (decisions 1 and 6)

- [ ] **Step 3: Operator merges via GitHub.**

After merge, the rest of this plan runs against the merged `dev` branch.

---

## Chunk 2: Vercel provisioning — Gate A

**This entire chunk is operator work.** No code changes. The agent's role is to brief the operator on each step and verify success criteria.

### Task 4: Create the two Vercel projects

**Operator** — using Vercel team-admin access:

- [ ] **Step 1: Create `apps/cdn` project**
  - Vercel Dashboard → New Project → Import from GitHub → `perimeterchurch/perimeter-widgets`.
  - Root directory: `apps/cdn`.
  - Framework preset: Next.js (auto-detected).
  - Domain: add `widgets.perimeter.org` for Production (DNS configured in Task 7).
  - Default git branch: `main`.

- [ ] **Step 2: Create `apps/studio` project**
  - Same flow.
  - Root directory: `apps/studio`.
  - Domain: add `studio.perimeter.org` for Production.

- [ ] **Step 3: Verify** — both projects show up in the team's Vercel dashboard, each linked to the same repo, each with its own deployment URL.

### Task 5: Provision the Blob store

**Operator:**

- [ ] **Step 1:** Vercel Dashboard → Storage → Create Blob store.
- [ ] **Step 2:** Bind the store to both `apps/cdn` and `apps/studio` (Production + Preview environments).
- [ ] **Step 3:** Capture env vars injected by Vercel:
  - `BLOB_READ_WRITE_TOKEN` — should appear in both projects' env settings automatically.
  - `BLOB_PUBLIC_BASE_URL` — Vercel may not inject this as-is; if not, look up the store's public URL in the dashboard (form `https://<id>.public.blob.vercel-storage.com`) and add it manually to both projects' env vars (Production + Preview).

### Task 6: Provision the Upstash Redis store

**Operator:**

- [ ] **Step 1:** Vercel Dashboard → Marketplace → search for "Upstash" → install Upstash Redis.
- [ ] **Step 2:** Create a Redis database via the integration; bind to both `apps/cdn` and `apps/studio` (Production + Preview).
- [ ] **Step 3:** Verify the four env vars `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL` appear in both projects' env settings. Only `KV_REST_API_URL` and `KV_REST_API_TOKEN` are used by the code; the others are harmless.

> **Tripwire:** If the Marketplace store exposes ONLY a raw `REDIS_URL` and not the REST vars, stop here. Tracked in the follow-ups doc as item #9 — a small `@upstash/redis`-compatible adapter would need to be written. Surface this back to the agent/owner before continuing.

### Task 7: Studio-only env vars

**Operator:**

- [ ] **Step 1:** Generate a `BETTER_AUTH_SECRET` for Production:

```bash
openssl rand -base64 32
```

Add to the `apps/studio` Vercel project's env (Production scope). Generate a SEPARATE secret for Preview and add it to the Preview scope.

- [ ] **Step 2:** Add `BETTER_AUTH_URL` to `apps/studio`:
  - Production: `https://studio.perimeter.org`
  - Preview: use the auto-generated `*.vercel.app` URL (or skip Preview for this var if previews don't need sign-in).

- [ ] **Step 3:** Pull `MP_API_BASEURL`, `MP_API_CLIENT`, `MP_API_SECRET` from the helpdesk/metrics Vercel projects (same MP OAuth app is reusable). Add to `apps/studio` Production scope.

### Task 8: Register the MP OAuth redirect URI

**Operator** — in the Ministry Platform admin:

- [ ] **Step 1:** Register `https://studio.perimeter.org/api/auth/callback/ministryplatform` as a permitted redirect URI for the MP OAuth client.
- [ ] **Step 2:** Optionally register the preview URL equivalent if preview deploys should support sign-in.

### Task 9: Configure DNS

**Operator** — in the perimeter.org DNS provider:

- [ ] **Step 1:** Add a CNAME for `widgets.perimeter.org` per Vercel's domain wizard.
- [ ] **Step 2:** Add a CNAME for `studio.perimeter.org` per Vercel's domain wizard.
- [ ] **Step 3:** Wait for DNS propagation (typically <15 minutes); confirm via `dig widgets.perimeter.org` and `dig studio.perimeter.org`.

### Task 10: Validate Gate A

After Tasks 4–9 are complete and the latest `dev` (with Chunk 1's code) is deployed to both Vercel projects:

- [ ] **Step 1:** `curl -i https://widgets.perimeter.org/manifest.json`
  - Expected: HTTP 200, body `{}`, header `Access-Control-Allow-Origin: *`, header `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400`.
- [ ] **Step 2:** `curl -i https://widgets.perimeter.org/sermons/latest.js`
  - Expected: HTTP 404, header `Cache-Control: public, max-age=60`, header `Access-Control-Allow-Origin: *`. (No widget published yet.)
- [ ] **Step 3:** `curl -i https://studio.perimeter.org/`
  - Expected: HTTP 200 with the studio shell HTML.
- [ ] **Step 4:** Navigate to `https://studio.perimeter.org/admin/login` in a browser.
  - Expected: the MP sign-in button renders. **Do NOT click it yet** — sign-in happens at Gate C.
- [ ] **Step 5 (regression check):** Run `RELEASE_STORE_DRIVER=memory pnpm publish-widget sermons` locally.
  - Expected: prints `Published sermons@<sha>-... — available, not yet live.` and exits 0. The memory driver is per-process so this leaves no real artifact.

**Gate A complete** when all five validation checks pass. If any fail, fix the corresponding provisioning step and re-run.

---

## Chunk 3: First production publish — Gate B

**Operator-led** with code execution by the agent.

### Task 11: Run `pnpm publish-widget sermons` against production

**Operator** — with shell access to the perimeter-widgets repo locally:

- [ ] **Step 1: Pull latest `dev`**

```bash
git checkout dev && git pull origin dev
pnpm install
```

- [ ] **Step 2: Export the four production env vars in your shell**

```bash
export KV_REST_API_URL="<from Vercel project settings>"
export KV_REST_API_TOKEN="<from Vercel project settings>"
export BLOB_READ_WRITE_TOKEN="<from Vercel project settings>"
export BLOB_PUBLIC_BASE_URL="<from Vercel project settings>"
```

> **Do NOT commit these values anywhere.** They are session-only.

- [ ] **Step 3: Run the publish**

```bash
pnpm publish-widget sermons
```

Expected output:

```
Published sermons@1.0.0 (801 KB gz) — available, not yet live.
```

(The size will be ~801 KB given the inlined pdf.js worker from Phase 3 follow-up #8.)

- [ ] **Step 4: If the publish fails:**
  - "no KV credentials" → check that all four env vars are exported in the same shell session
  - "BLOB_READ_WRITE_TOKEN required" → check `BLOB_READ_WRITE_TOKEN`
  - "BLOB_PUBLIC_BASE_URL required" → check `BLOB_PUBLIC_BASE_URL`
  - "Build sermons@1.0.0 already exists" → either the publish already succeeded once OR `widgets/sermons/package.json` is on the wrong version. Verify via Task 12 below.

### Task 12: Validate Gate B

- [ ] **Step 1:** `curl -I https://widgets.perimeter.org/sermons/1.0.0/index.js`
  - Expected: HTTP 200, headers `cache-control: public, max-age=31536000, immutable` and `content-type: application/javascript; charset=utf-8`.
- [ ] **Step 2:** `curl -i https://widgets.perimeter.org/sermons/latest.js`
  - Expected: STILL HTTP 404 (no promote yet) with `cache-control: public, max-age=60`.
- [ ] **Step 3:** `curl https://widgets.perimeter.org/manifest.json`
  - Expected: STILL `{}` (sermons isn't promoted yet, so it's not in the manifest).
- [ ] **Step 4:** Sign in to studio (Gate C's first step is below; this is a peek to verify the activity log entry exists) — actually defer this to Gate C.

**Gate B complete** when the bundle URL serves 200 + the immutable cache header, but `latest.js` still 404s. The widget bytes exist in Blob and the ledger shows the publish record; nothing is live to users yet.

**Rollback at Gate B:** Nothing has been promoted; no user impact. If the wrong content shipped, simply do not promote — the bundle sits dormant in Blob. Investigate, fix, re-publish (would require a new version since `1.0.0` is now consumed).

---

## Chunk 4: First promote — Gate C

### Task 13: Studio admin sign-in

**Operator** — in a fresh browser session:

- [ ] **Step 1:** Navigate to `https://studio.perimeter.org/admin/login`.
- [ ] **Step 2:** Click "Sign in with Ministry Platform".
- [ ] **Step 3:** Complete MP OAuth flow. After the callback, you should land on `/admin/releases`.

> **If sign-in fails:**
> - "Invalid redirect URI" → verify Task 8 registered the production URI correctly with MP.
> - Better Auth callback error → verify `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are set in Vercel's Production env scope and the studio app has been redeployed since.
> - Page redirects back to `/admin/login` infinitely → cookie prefix mismatch; verify the studio code is on the post-rebuild branch.

### Task 14: Promote sermons@1.0.0

**Operator** — on `/admin/releases`:

- [ ] **Step 1:** The sermons panel should list one available build: `1.0.0`. No `LATEST` badge.
- [ ] **Step 2:** Click `Promote 1.0.0`.
- [ ] **Step 3:** Wait for the page to refresh (server action + `revalidatePath`).
- [ ] **Step 4:** Verify the activity log gains a `promote sermons@1.0.0 by <your email>` entry.

### Task 15: Validate Gate C

- [ ] **Step 1:** `curl -I https://widgets.perimeter.org/sermons/latest.js`
  - Expected: HTTP 302, headers `location: /sermons/1.0.0/index.js`, `cache-control: public, s-maxage=300, stale-while-revalidate=86400`, `access-control-allow-origin: *`.
- [ ] **Step 2:** `curl https://widgets.perimeter.org/manifest.json`
  - Expected: `{"sermons":"/sermons/latest.js"}`.
- [ ] **Step 3:** Paste this snippet into a plain HTML test page (a local file works):

```html
<!doctype html>
<html><body>
<div data-perimeter-widget="sermons"></div>
<script src="https://widgets.perimeter.org/sermons/latest.js" defer></script>
</body></html>
```

Open the file in a browser. The widget should mount and display sermon listings from `api.perimeter.org`.

- [ ] **Step 4 (sanity check on the gate):** Sign out of studio. Navigate to `https://studio.perimeter.org/admin/releases` in an incognito window.
  - Expected: redirected to `/admin/login`. (Confirms middleware gate works in production.)

**Gate C complete** when `latest.js` 302s correctly, the manifest reflects the promotion, the embed snippet renders the widget on a test page, and the auth gate behaves correctly.

**Rollback at Gate C:** Click "Roll back to <older-version>" — but there is no older version yet at this point. To fully un-promote, no UI exists (per spec decision 5 it's deferred); manually set `latest:sermons = null` via the Vercel KV dashboard if absolutely needed. In practice: if Gate C reveals a problem, do not proceed to Gate D; fix the underlying cause, publish a new version (e.g. `1.0.1`), and promote that instead.

---

## Chunk 5: Private-page validation — Gate D

### Task 16: Set up the private WordPress page

**Operator** — in the WordPress admin:

- [ ] **Step 1:** Create a new page. Title: anything (e.g. "Sermons widget validation"). Status: Private OR Password-protected (your choice).
- [ ] **Step 2:** Add the embed snippet to the page body:

```html
<div data-perimeter-widget="sermons"></div>
<script src="https://widgets.perimeter.org/sermons/latest.js" defer></script>
```

The `data-perimeter-widget` attribute is the auto-mount contract baked in at `packages/widget-runtime/src/auto-mount.ts`.

- [ ] **Step 3:** Save / publish the private page. Open it in a browser session that has access.

### Task 17: Run the 11-row smoke matrix

**Operator** — on the private WordPress page. Each row must PASS:

| # | Check | Method | Pass Criteria |
|---|---|---|---|
| 1 | Widget mounts | Visual | Sermons listing renders with real data |
| 2 | Visual review | Visual | Layout looks correct on the embedded page; no broken styles |
| 3 | Filter URL bookmarks | Apply a filter → copy URL → reload | Filters persist after reload; param shape is `?sermons-<key>=` |
| 4 | PDF transcript view | Click a sermon → open PDF | PDF renders; DevTools shows NO request to `unpkg.com` |
| 5 | CSP-strict embed | Create a second test page with `<meta http-equiv="Content-Security-Policy" content="script-src 'self' widgets.perimeter.org">` and the same embed | Widget loads; pdf.js worker runs (blob URL is same-origin per CSP) |
| 6 | Mobile responsive | DevTools mobile emulation | Layout works on iPhone 14 + Pixel 7 viewports |
| 7 | Series detail → sermon → back | Click through nav | URL state stays consistent (`sermons-screen=detail`, etc.) |
| 8 | Audio player | Click a sermon with audio → play | Plays, scrubs, speed adjusts |
| 9 | Network audit | DevTools Network tab on fresh load | Requests only to `widgets.perimeter.org`, `api.perimeter.org`, audio CDN (Sardius), and host site. NO `unpkg.com`, `cdn.jsdelivr.net`, no other surprises |
| 10 | Cold-load bundle size | DevTools Network → size of `latest.js` after 302 | ~801 KB gz (matches the 850 KB budget; matches what `pnpm publish-widget` reported) |
| 11 | Browser console | DevTools Console on fresh load | No errors, no warnings beyond expected React production noise |

- [ ] **Step 1: Walk through each row.** Take screenshots or notes for any failing row.

- [ ] **Step 2: If any row fails:**
  - Issue is in widget code → fix in widgets/sermons, publish `1.0.1`, promote, re-test Gate D.
  - Issue is in CDN config → fix in apps/cdn, redeploy, re-test (no republish needed).
  - Issue is operational (CORS, env vars) → fix and re-test.

### Task 18: Test the promote/rollback cycle

Before depending on rollback at Gate E, validate it actually works on production infrastructure.

**Operator** — on `/admin/releases`:

- [ ] **Step 1:** Publish a second build via `pnpm publish-widget sermons` (will create `1.0.0-<sha>` since you're on a feature branch with uncommitted changes, OR bump the package.json to `1.0.1`, OR run with `--force` to create a `1.0.0-<sha>` dev build).
- [ ] **Step 2:** In studio, promote the newer version.
- [ ] **Step 3:** Verify `https://widgets.perimeter.org/sermons/latest.js` 302s to the newer version.
- [ ] **Step 4:** Click "Roll back to 1.0.0" on the older row.
- [ ] **Step 5:** Verify `latest.js` now 302s to 1.0.0 again.
- [ ] **Step 6:** Verify the activity log has both a `promote` and a `rollback` entry.

### Task 19: Validate Gate D

**Gate D complete** when:
- All 11 smoke matrix rows pass.
- The promote/rollback cycle works end-to-end on production infrastructure.
- The repository owner is available for Gate E.

**Rollback at Gate D:** Take down the private page. No public users were affected.

---

## Chunk 6: Production embed — Gate E

### Task 20: Coordinate the embed deployment window

**Operator + repo owner** — synchronously:

- [ ] **Step 1:** Decide on the deployment moment. Low-traffic windows are preferred but not required (there's no live legacy to disrupt). 30 minutes of pair availability is required afterward.
- [ ] **Step 2:** Brief the owner on the rollback path (Task 23 below). Owner is the sole rollback authority per spec decision 3.

### Task 21: Edit the public WordPress sermons page

**Operator** — in WordPress:

- [ ] **Step 1:** Open the public sermons page editor.
- [ ] **Step 2:** Add the embed snippet:

```html
<div data-perimeter-widget="sermons"></div>
<script src="https://widgets.perimeter.org/sermons/latest.js" defer></script>
```

- [ ] **Step 3:** Save / publish. Confirm the page goes live within 60 seconds.
- [ ] **Step 4:** Purge the WordPress page cache (Cloudflare? Varnish? whatever the production cache layer is) so the new HTML is served immediately rather than served from cache.

### Task 22: Monitoring windows

**Operator + owner — pair watching the first 5 minutes:**

- [ ] **Step 1: 0–5 minutes.** Open the public sermons page in a fresh anonymous browser session. Verify:
  - Widget mounts within ~2 seconds of page load
  - No console errors
  - Sermons render with real data
  - Network tab shows requests only to expected origins (see smoke matrix row 9)

**Operator — periodic checks:**

- [ ] **Step 2: 5–60 minutes.** Re-check the page every 10–15 minutes. Watch Vercel CDN logs for traffic on `widgets.perimeter.org/sermons/latest.js` — should see steady traffic shaped like sermon-page visits.
- [ ] **Step 3: 60 minutes – 24 hours.** Spot-check every 4–6 hours. If user reports come in, surface them immediately to the owner.

### Task 23: Validate Gate E

**Gate E complete** when:
- Widget loads correctly on the public sermons page.
- No console errors over the first hour.
- Vercel CDN logs show traffic that broadly matches WordPress sermon-page visit rates.
- Zero P0 issues reported by users.

**Rollback at Gate E** (owner-only decision per spec decision 3):
- **Trigger criteria:** any P0 user report ("the sermons page is broken"), OR a clear breaking regression discovered post-deploy.
- **Action:** remove the `<script src="https://widgets.perimeter.org/sermons/latest.js">` and the `<div data-perimeter-widget="sermons">` from the WordPress page. Save, purge cache.
- **Time-to-rollback target:** <15 minutes from trigger decision.
- **Post-rollback:** the widget infrastructure stays running. Investigate, fix, re-do Gate D, re-attempt Gate E with a new published version.

> **Acceptance:** If the owner is unavailable for >2 hours during a rollback-trigger event, the operator may put a maintenance message on the WordPress page (plain HTML, no widget) and wait for the owner. This is documented in the spec's risk table.

---

## Chunk 7: jsDelivr retirement + completion — Gate F

Immediately after Gate E per spec decision 4 (no parallel-running period since jsDelivr was never live).

### Task 24: Disable the legacy build pipeline

**Operator** — in the legacy widget repository. The legacy repo is the GitHub repository that previously fed `cdn.jsdelivr.net/gh/perimeterchurch/.../legacy.js`. As of this plan being written it was not separately named in the umbrella spec; **verify the repository URL with the owner before acting**. If the legacy code lives in this same repo under the archived `legacy/v1` branch (rather than a separate repo), Tasks 24.1–24.3 still apply but operate on that branch instead.

- [ ] **Step 1:** Identify any GitHub Actions workflow that built or pushed widget bundles for jsDelivr serving. Disable it (rename `.github/workflows/<name>.yml` to `.disabled` or delete it).
- [ ] **Step 2:** If `dist/` files are committed in the legacy repo, delete them in a cleanup commit to prevent accidental publish.
- [ ] **Step 3:** Add a README banner pointing at the new repo and noting the cutover date:

```markdown
> **Archived.** Active development moved to [perimeter-widgets](https://github.com/perimeterchurch/perimeter-widgets) on YYYY-MM-DD. This repository is read-only.
```

### Task 25: Tag the `legacy/v1` branch

**Operator** — in the new repo (`perimeter-widgets`):

- [ ] **Step 1:** Verify the `legacy/v1` branch still exists at the expected SHA.

```bash
git fetch origin
git log --oneline origin/legacy/v1 | head -3
```

- [ ] **Step 2:** Create an annotated tag and push.

```bash
git tag -a legacy/v1-archived origin/legacy/v1 -m "Archived at Phase 4 cutover (YYYY-MM-DD). Legacy pre-rebuild code."
git push origin legacy/v1-archived
```

- [ ] **Step 3 (optional):** Delete the branch now that it is preserved under a tag.

```bash
git push origin --delete legacy/v1
```

### Task 26: Update CLAUDE.md

**Agent — on a new feature branch off `dev`:**

- [ ] **Step 1: Branch off `dev`**

```bash
git checkout dev && git pull
git checkout -b docs/widgets-phase-4-complete
```

- [ ] **Step 2: Edit `CLAUDE.md`** — replace the Status section content:

Find the Status section and replace it with:

```markdown
## Status

Phase 4 complete. Production widgets are served from `widgets.perimeter.org`; the admin UI for promote/rollback lives at `studio.perimeter.org/admin/releases`.

Umbrella spec: `docs/superpowers/specs/2026-05-22-perimeter-widgets-rebuild-design.md`

Phase 4 design spec: `docs/superpowers/specs/2026-05-28-perimeter-widgets-phase-4-cutover-design.md`

Phase 4 implementation plan: `docs/superpowers/plans/2026-05-29-perimeter-widgets-phase-4-cutover.md`

**Release workflow:** run `pnpm publish-widget <name>` to build, upload, and record a new version, then promote it at `/admin/releases` on the studio.

**Next:** widget #2 — feeds the case for shipping the `loader.js` global page-scan loader (Phase 3 follow-up #1) and for automating publish via GitHub Actions (Phase 3 follow-up #2).
```

- [ ] **Step 3: Commit**

```bash
git commit -F - <<'EOF'
docs: mark Phase 4 cutover complete

Production widgets are live on widgets.perimeter.org as of <date>. Update
CLAUDE.md to reflect the new status, point at the Phase 4 spec and plan,
and surface the next two follow-ups (loader.js and GitHub Actions publish).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
```

- [ ] **Step 4: Push + open PR**

```bash
git push -u origin docs/widgets-phase-4-complete
gh pr create --base dev --head docs/widgets-phase-4-complete --body-file <path>
```

- [ ] **Step 5: Operator merges.**

### Task 27: Validate Gate F

**Gate F complete** when:
- Legacy build pipeline is disabled.
- `legacy/v1-archived` tag exists in the new repo.
- `CLAUDE.md` Status section reflects "Phase 4 complete."
- The repo owner has confirmed all three.

**There is no rollback at Gate F.** Gate F is the cleanup phase; nothing user-facing changes. If something is wrong, fix forward.

---

## Definition of done (Phase 4)

All six gates passed:
- **A:** Vercel resources provisioned + CORS deployed.
- **B:** `pnpm publish-widget sermons` succeeded against prod store; bundle URL serves the immutable `1.0.0` bytes.
- **C:** Studio admin sign-in works; `sermons@1.0.0` promoted; manifest reflects the promotion.
- **D:** 11-row smoke matrix passed on the private WordPress page; promote/rollback cycle proven on prod infra.
- **E:** Public WordPress page embeds the widget; first hour clean; first 24 hours clean.
- **F:** Legacy build pipeline disabled; `legacy/v1-archived` tag created; CLAUDE.md updated.

After Phase 4: future widget development lands directly via `pnpm publish-widget <name>` + `/admin/releases`. The next two natural follow-ups are Phase 3 tracker items #1 (`loader.js`) and #2 (GitHub Actions auto-publish).

---

## Out of scope (do NOT build during Phase 4)

These items are listed for an executing agent to explicitly refuse if asked to scope-creep:

- **GitHub Actions auto-publish.** Tracked separately. Lands after Phase 4 stabilizes (need 1-2 manual publishes first to prove the flow).
- **`loader.js` page-scan loader.** Tracked separately. Defer until widget #2 exists.
- **Bundle optimization (move pdf.js worker to a same-origin static URL with CORS).** Tracked in the spec's "Optimization tracked for after cutover" section. Do AFTER Phase 4 stabilizes, not during, so we don't redeploy the widget mid-monitoring.
- **Un-promote button in studio admin.** Per spec decision 5, deferred indefinitely.
- **Multi-instance sermons widgets.** Per spec decision (Phase 3 follow-up #7's note), the new prefix is intentionally single-instance.

Each of these has a tracked landing place; if an agent encounters a reason to do one of them during Phase 4 execution, the right move is to surface the case to the owner rather than expanding Phase 4 scope.
