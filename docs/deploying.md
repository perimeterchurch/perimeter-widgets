# Deploying the widgets project

How to take the platform live and serve widgets in production. For the day-to-day release model (immutable bundles, manifest, `pnpm release`, promote/rollback) see [`hosting-and-release.md`](./hosting-and-release.md). For the gated first-launch runbook see [`superpowers/plans/2026-06-01-perimeter-widgets-streamline-phase-4-cutover.md`](./superpowers/plans/2026-06-01-perimeter-widgets-streamline-phase-4-cutover.md).

## Deploy targets

| Target | What it serves | Domain | Required? |
| --- | --- | --- | --- |
| **CDN** | the committed widget bundles in `cdn/` that host pages (WordPress) load | `widgets.perimeter.org` | **Yes** — this is production |
| **Studio gallery** | the read-only component/widget showcase (`studio/`) | `style.perimeter.org` | Optional / internal |

The CDN is a **plain static directory** — no build step. `cdn/vercel.json` supplies the cache headers, CORS, and the `/<name>/latest.js` rewrites. The released bundles already target `https://api.perimeter.org`, so the CDN project needs **no environment variables**.

---

## 0. Prerequisites

- Get the code onto the branch you'll deploy. Production comes from **`main`** (our `main`-is-release-only flow): land the phase PRs on `dev`, then open the batched **release PR `dev → main`**. The `cdn/` bundles for `example@0.0.0` and `sermons@1.0.1` are already committed, so `main` has them after the release.
- Alternatively, point the CDN project at **`dev`** to serve immediately, before cutting a release.

---

## 1. Deploy the CDN → `widgets.perimeter.org` (required)

`cdn/vercel.json` pins `framework: null`, empty `buildCommand`/`installCommand`, and `outputDirectory: "."`, so Vercel skips framework detection + build + install and serves the directory as-is. The **one setting that must be right in the dashboard is the Root Directory.**

### Via the Vercel dashboard
1. **Add New → Project**, import `perimeterchurch/perimeter-widgets`. Create a **new** project (separate from any existing one).
2. **Root Directory:** set to exactly **`cdn`**.
3. **General → "Include files outside the Root Directory in the Build Step": turn OFF.** ← critical in this Turbo monorepo. If it's on (or Root Directory is blank), Vercel pulls the whole repo, detects Turbo, runs `turbo build`, finds no app output, and fails with `No Output Directory named "public" found`.
4. **Framework Preset:** **Other**.
5. **Build & Output Settings:** `cdn/vercel.json` already sets these; if you override in the dashboard, use **empty Build Command**, **empty Install Command**, and **Output Directory = `.`** (or blank). Never let it run `turbo build`.
6. **Environment Variables:** none (the released bundle already targets `api.perimeter.org`).
7. **Production Branch:** `main` (or `dev` to launch pre-release).
8. Deploy. Then **Settings → Domains → add `widgets.perimeter.org`** and follow the DNS instructions.

> **Troubleshooting (real cases we hit):**
> - `The specified Root Directory "apps/cdn" does not exist` → the old Next.js path; change it to **`cdn`**.
> - `Detected Turbo … Running build in 0 packages … No Output Directory named "public" found` → Vercel is building from the repo root. **Root Directory is blank or "Include files outside the Root Directory" is on.** Set Root Directory = `cdn` and turn that toggle **off**.

### Or via the Vercel CLI
```bash
cd cdn
vercel link      # create/link a new project
vercel --prod    # deploy the static dir to production
# attach the domain in the dashboard, or: vercel domains add widgets.perimeter.org
```

---

## 2. Verify the CDN (Gate B)

Once the domain resolves, all four must return the expected status + headers:

```bash
curl -sI https://widgets.perimeter.org/sermons/1.0.1/index.js
#   → 200; cache-control: public, max-age=31536000, immutable; access-control-allow-origin: *

curl -s  https://widgets.perimeter.org/manifest.json
#   → {"example":"0.0.0","sermons":"1.0.1"}

curl -sI https://widgets.perimeter.org/sermons/latest.js
#   → 200 (rewritten to the current versioned bundle)

curl -sI https://widgets.perimeter.org/loader.js
#   → 200
```

A missing/wrong `cache-control`, or a `latest.js` that 404s, is a **no-go** — fix `cdn/vercel.json` or the project's Root Directory/Output settings and redeploy before embedding.

---

## 3. Smoke-test on a private WordPress page (Gate C)

Create a **private/unpublished** WordPress page, add the embed (next section), and walk the matrix:

- desktop **and** mobile
- grid / list views; series → sermon navigation
- filters (speaker / book / service type) and a **bookmarkable filter URL that survives reload**
- a sermon with a **PDF** (text + annotation layers styled correctly inside the shadow root)
- audio and **video (HLS)** playback
- **no console errors**; no host-page CSS bleeding into the widget

Any functional break → fix on a branch, `pnpm release sermons` a patch version, redeploy, re-test. Never publish the test page.

---

## 4. Go live — embed on the public page (Gate D)

```html
<div data-perimeter-widget="sermons"></div>
<script src="https://widgets.perimeter.org/sermons/1.0.1/index.js" async></script>
```

- **Defaults:** sermons tab, grid view, 12 per page.
- **Config attributes** (real schema — verify against `widgets/sermons/src/types.ts`): `data-per-page="24"`, `data-default-view="grid|list|large"`, `data-default-tab="sermons|series"`, `data-series-id="…"`, `data-display="full|compact|headless"`, `data-api-url="…"`. There is **no** `data-limit` / `data-initial-view` / `data-campus`.
- **Auto-update vs pinned:** use `…/sermons/latest.js` to pick up future promotions automatically (~1 min after a manifest change), or the pinned `…/sermons/1.0.0/index.js` for an immutable launch.
- **Auth:** sermons is public (`auth: 'none'`) — no login/token needed. Authenticated widgets would require the host page to set `localStorage['mpp-widgets_AuthToken']`.

> **Note:** `sermons@1.0.1` includes the `perPage` string-coercion fix, so `data-per-page="24"` works in embeds. (`1.0.0` is retained in the CDN for any already-pinned embeds, but it predates that fix — numeric `data-*` overrides only work on `1.0.1`+.)

---

## 5. Monitor, then finalize (Gates E–F)

- Watch the CDN project's **Vercel deployment logs** for ~a week: request volume to `sermons/*` + `manifest.json`, and 4xx/5xx rates. Spot-check the live page.
- When stable, **archive `legacy/v1`** (keep as a branch or tag — reference only). Confirm `.github/workflows/` has only `ci.yml` (the jsDelivr pipeline is already removed). The migration is then complete.

---

## 6. Releasing widget updates (after launch)

```bash
git checkout -b release/sermons-1.0.1
# bump widgets/sermons/package.json version
pnpm release sermons     # build → copy to cdn/sermons/<ver>/ → update manifest + latest rewrite → prune to 5 → commit
git push -u origin HEAD
gh pr create --base dev   # then a dev → main release PR
```

- **Promote** = merging the manifest change to the deployed branch. The edge picks it up within ~a minute; `latest.js` consumers move to the new version. Pinned `…/<version>/index.js` embeds keep working.
- **Rollback** = revert the manifest commit and redeploy, or use **Vercel Instant Rollback** on the CDN project (instant, no rebuild).
- Re-releasing an existing version is refused (immutable); bump the version or pass `--force`. The CLI keeps the last 5 versions per widget.

---

## 7. Optional — deploy the studio gallery → `style.perimeter.org`

The studio is a Vite app that depends on workspace packages, so it builds from the monorepo:

- New Vercel project — **Root Directory: `studio`**, **Framework: Vite**, **Build Command: `pnpm build`** (or `vite build`), **Output Directory: `dist`**. Vercel detects the pnpm workspace and installs from the repo root.
- Attach `style.perimeter.org`.

> ⚠️ Confirm whether `style.perimeter.org` already points at an existing project before repointing the domain.
