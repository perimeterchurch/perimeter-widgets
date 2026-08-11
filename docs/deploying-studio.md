# Deploying the studio → `style.perimeter.org`

How to take the studio live at `style.perimeter.org`, **gated behind Ministry Platform login**. The deployment is the `studio-host/` **Next.js shell** (Option C of `docs/superpowers/plans/2026-08-10-studio-mp-auth-wall.md`): it authenticates the visitor, restricts access to MP roles **Administrators (2)** and **Website Folder - Edit (237)**, and serves the Vite-built studio (`studio/dist`) as static assets behind the gate. The studio content itself is unchanged — still the read-only design-system gallery; source-mounted previews still hit the production API (`api.perimeter.org`).

For the widget **CDN** (`widgets.perimeter.org`) see [`deploying.md`](./deploying.md) — that project is unaffected by this change. This runbook is the studio gallery only.

> **Owner-driven.** The Vercel project settings, environment secrets, DNS, and the one MP-admin step below require Vercel + DNS + MP admin access and are done by the repo owner / MP admin. This doc is the runbook; nothing here is automated.

> **⚠️ This supersedes the previous Vite-static deploy.** The site used to be a static Vite SPA whose routing came from the repo-root `vercel.json` SPA-fallback rewrite. It is now a **Next.js app** whose routing (SPA fallback + `/api/auth/*` + the gate) is handled by `studio-host/next.config.ts` and `studio-host/middleware.ts`. The repo-root `vercel.json` rewrite is **no longer used** by this project and can be retired once the old project is decommissioned (see step 6).

---

## 0. Decide: reconfigure in place, or new project

Two ways to cut over the `style.perimeter.org` domain:

- **A — Reconfigure the existing Vercel project** (recommended): change its Framework/Build/Root settings from the old Vite-static values to the Next shell values (§2). Keeps the domain attached — no DNS change. The catch: switching Framework preset mid-project can be finicky; double-check every setting in §2.
- **B — New project + move the domain**: create a fresh Vercel project for the shell, deploy it, verify on its `*.vercel.app` URL, then move the `style.perimeter.org` domain from the old project to the new one (§5). Cleaner separation and easy rollback (the old project stays intact until you remove the domain), at the cost of a domain move.

The rest of this runbook applies to either.

---

## 1. MP-admin: register the redirect URI

The shell uses the **same MP OAuth client as perimeter-api / KB** (client id `perimeter-api`). On that client's record (MP admin → API Clients → `perimeter-api`), **add** to the Redirect URIs list:

```
https://style.perimeter.org/api/auth/oauth2/callback/ministryplatform
```

- This is **additive** — leave the existing entries (KB's, `http://localhost:5173/...`) in place. The `authorization_code` grant is already enabled on this client, so nothing else on the record changes. (See the plan §7; OAuth matches redirect URIs verbatim — exact scheme/host/path, no trailing slash.)
- **Preview deploys:** Vercel preview URLs are per-deployment hashes and can't all be pre-registered. Either (a) assign the shell a **stable preview alias** (e.g. `studio-preview.perimeter.org`) and register its callback too, or (b) accept that **auth only works on localhost + production** and test preview builds without sign-in. Decide with the owner.

---

## 2. Vercel project settings (Next shell)

Set these in the dashboard (Project → Settings). They differ from the old Vite-static settings.

| Setting | Value | Why |
| --- | --- | --- |
| **Framework Preset** | **Next.js** | The deployment is now the `studio-host` Next app. |
| **Root Directory** | **`studio-host`** | Vercel detects the Next app + its `.next` output here. |
| **Include files outside the Root Directory** | **ON** | The build also builds the sibling Vite `studio/` and imports workspace packages — they live outside `studio-host/`, so Vercel must include the whole repo. (This toggle is **dashboard-only**.) |
| **Install Command** | `pnpm install` | Installs the whole pnpm workspace from the root lockfile. |
| **Build Command** | `pnpm build` (i.e. the shell's `build` script) | Its `prebuild` hook runs `pnpm --filter @perimeter/studio build` → `embed-studio.mjs` (copies `studio/dist` → `studio-host/public`) → `next build`. |
| **Output Directory** | *default* (leave blank) | Next manages `.next`; do not set the old `studio/dist`. |
| **Node.js Version** | **22.x (≥ 22.18)** | Below 22.18 the studio's Vite build fails with `ERR_UNKNOWN_FILE_EXTENSION ".ts"` from `@perimeter/vite-plugin-widget`. If the available Node is older, add env `NODE_OPTIONS=--experimental-strip-types`. |
| **Production Branch** | `main` | Auto-deploys on merge to `main`; preview deploys per PR. |

> Vercel has native **Turborepo** support: with Root Directory = `studio-host` it can resolve workspace deps via `turbo.json`. If the build can't find `studio/dist` or `@perimeter/*`, the **"include files outside root" toggle is off** — turn it on. If `next build` isn't detected, the **Root Directory isn't `studio-host`**.

No committed `vercel.json` is needed for the shell — routing lives in `studio-host/next.config.ts` (SPA fallback via `afterFiles`) and `studio-host/middleware.ts` (the gate).

---

## 3. Environment variables (Production, and Preview if used)

The shell's Vercel project needs (it previously had none):

| Var | Value | Notes |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` | Fresh; do **not** reuse KB's / Metrics'. |
| `BETTER_AUTH_URL` | `https://style.perimeter.org` | Must equal the origin the callback redirect URI was registered under (§1). |
| `MP_API_BASEURL` | `https://ministryplatform.perimeter.org/ministryplatformapi` | |
| `MP_API_CLIENT` | `perimeter-api` | The shared OAuth client. |
| `MP_API_SECRET` | *(the client secret)* | Same secret perimeter-api / KB use for this client. |

- Scope them to **Production** (and **Preview** only if you registered a preview callback in §1).
- `MP_API_CLIENT`/`SECRET` are used for the OIDC **code exchange** only — the role gate reads the OIDC `roles` claim, so there is **no** MP REST lookup / service call at request time.

---

## 4. Deploy

Push `feat/studio-auth-shell` → PR into `dev` → merge to `dev` → `main` (per the repo git rules). Vercel builds on merge to `main` (and per-PR previews). Or, for a first manual cut, `vercel --prod` from the linked project.

If the build fails: re-check §2 (Root Directory `studio-host`, toggle ON, Node ≥ 22.18) and §3 (all five env vars present).

---

## 5. Point / move DNS (owner)

- **Option A (reconfigure):** the domain is already attached — nothing to do.
- **Option B (new project):** in the new project **Settings → Domains** add **`style.perimeter.org`**; Vercel will prompt to move it from the old project. Verify the shell on its `*.vercel.app` URL **before** moving the domain.

---

## 6. Post-deploy smoke checklist

On `style.perimeter.org`, in a fresh/incognito browser:

- [ ] **Unauthenticated → gate.** Visiting `/` (or any deep link) with no session **redirects to `/signin`**, then on to Ministry Platform.
- [ ] **Authorized user reaches the studio.** Sign in as a user with role **2** or **237** → lands back in the studio; the URL never retains `?cacheKey`/OAuth params.
- [ ] **Deep links work once authed.** Hard-reload `/tokens`, `/components/button`, `/guides/styling-widgets` → each renders (SPA fallback via `next.config.ts`).
- [ ] **Unauthorized user is refused.** Sign in as a user with **neither** role → lands on **`/unauthorized`**, and no session cookie is set (a subsequent `/` still redirects to `/signin`). *(Needs a non-role test account — this is the one check that can't be done with an admin login.)*
- [ ] **Sign-out works.** From `/unauthorized` (or the signed-in state), sign out → `/` redirects to `/signin` again.
- [ ] **A widget runs against the production API.** `/widgets/sermons` pulls live data from `api.perimeter.org`; no console errors; no host-page CSS bleed into the shadow root.
- [ ] **Neighbors unaffected.** `widgets.perimeter.org` (CDN) and the embed-lab are separate projects and still serve normally — only the studio origin is gated.

Any failure is a **no-go** — fix on a branch, redeploy, re-run this list before announcing.

### Retire the old routing (after cutover)

Once the shell is live and verified, the repo-root `vercel.json` SPA-fallback rewrite is dead for this project (the shell owns routing). Remove it in a follow-up PR **only after** confirming no remaining Vercel project reads it (the CDN uses `cdn/vercel.json`, not the repo-root one).

---

## 7. Updating the site

Still auto-deploys from `main` (preview per PR): merge component MDX, guides, new widgets, or token changes through the normal `dev → main` flow and the gallery updates on the next production build — now behind the login gate. No manual publish step.

---

## Rollback

- **Option B (new project):** move the `style.perimeter.org` domain back to the old Vite-static project — instant un-gate.
- **Option A (reconfigure) / general:** revert the shell PR (the shell is additive — `studio-host/`, the workspace entry, and this doc), and restore the old Vercel Framework/Build/Root settings. Optionally remove the `style.perimeter.org` redirect URI from the MP client. No CDN/loader/widget-runtime surface changed.
