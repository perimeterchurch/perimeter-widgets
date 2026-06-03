# Deploying the studio → `style.perimeter.org`

How to take the studio live as the team's deployed, read-only **design-system site** at `style.perimeter.org`. The studio is one Vite app with two faces: the local dev harness (`pnpm dev`) and this deployed gallery. The deployed build is read-only by nature — it's a static SPA. Source-mounted widget previews still hit the **production** API (`api.perimeter.org`); the only thing the deployed site drops is the dev-only built-bundle preview (gated behind `import.meta.env.DEV`).

For the widget **CDN** deploy (the required production target at `widgets.perimeter.org`) see [`deploying.md`](./deploying.md). This runbook is the studio gallery only.

> **Owner-driven.** Creating the Vercel project and pointing DNS for `style.perimeter.org` require Vercel + DNS access and are done by the repo owner. This doc is the runbook; nothing here is automated.

---

## How the studio deploy differs from the CDN

The CDN (`cdn/`) is a **plain static directory with no build** — `cdn/vercel.json` sets `framework: null` and empty build/install commands, and its Root Directory is `cdn`. The studio is the opposite: it is a **Vite app that imports workspace packages** (`@perimeter/ui`, `@perimeter/theme`, `@perimeter/widget-runtime`, the widgets themselves for discovery), so its build **needs the whole monorepo present**. That single fact drives every setting below.

The widgets-cdn gotchas about Root Directory and the "Include files outside the Root Directory" toggle being **dashboard-only** apply here too — but the studio resolves them the other way: instead of a narrow Root Directory with the toggle off, the studio uses the **repo root** as Root Directory so the full pnpm/Turbo workspace is available to the build.

---

## Build settings (these are DASHBOARD-ONLY for a monorepo subpackage)

`vercel.json` **cannot** express Root Directory, Build Command, Output Directory, or Install Command for a subpackage of a Turbo monorepo — those four are project settings configured in the Vercel dashboard (or via the CLI's project config), not in a committed file. `studio/vercel.json` only carries the SPA-fallback rewrite (see below). So you **must** set the following in the dashboard:

| Setting | Value | Why |
| --- | --- | --- |
| **Root Directory** | **repo root** (leave blank / `./` — **NOT** `studio`) | The build imports sibling workspace packages; pointing at `studio` would hide them and break the build. |
| **Framework Preset** | **Vite** | Vite SPA; Vercel applies the right defaults. |
| **Build Command** | `pnpm --filter @perimeter/studio build` | Builds only the studio (and its workspace deps via Turbo) from the repo root. |
| **Output Directory** | `studio/dist` | Vite writes the studio build here; from the repo root that's the relative path. |
| **Install Command** | `pnpm install` | Installs the whole workspace from the root lockfile. |

> **"Include files outside the Root Directory in the Build Step" is moot here** — when Root Directory = repo root there are no files "outside" it, so the toggle doesn't matter. (Contrast the CDN, where Root Directory = `cdn` and that toggle must be **off**.)

### `studio/vercel.json` (committed — SPA fallback only)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/((?!assets/).*)", "destination": "/index.html" }]
}
```

This is the **client-side-routing fallback**: every path that isn't a built asset (`/assets/*`) is served `index.html` so deep links like `/components/button`, `/tokens`, and `/guides/styling-widgets` resolve to the react-router SPA instead of 404ing. It does **not** — and cannot — set Root Directory or the build/output dirs; those stay in the dashboard.

---

## 1. Create the Vercel project (owner)

1. **Add New → Project**, import `perimeterchurch/perimeter-widgets`. Create a **new, separate** project (do not reuse the CDN project).
2. Apply the **Build settings** table above. Double-check **Root Directory is the repo root, not `studio`** — this is the most common mistake and the one that breaks the build.
3. **Environment Variables:** none. Source-mounted previews target the production API by default.
4. **Production Branch:** `main` — auto-deploys on every merge to `main`, exactly like the CDN. Preview deploys are created per PR automatically.
5. Deploy.

### Or via the Vercel CLI (from the repo root)

```bash
vercel link        # link a NEW project to the repo root
# in the dashboard set Root Directory = repo root, Build Command =
#   pnpm --filter @perimeter/studio build, Output Directory = studio/dist
vercel --prod      # build + deploy to production
```

> **Troubleshooting:** if the build runs `turbo build` over the whole workspace, or fails with "No Output Directory found", the **Build Command / Output Directory weren't applied** — re-enter `pnpm --filter @perimeter/studio build` and `studio/dist`. If it can't resolve `@perimeter/ui` / `@perimeter/theme`, the **Root Directory was set to `studio`** instead of the repo root.

## 2. Point DNS (owner)

In **Settings → Domains** add **`style.perimeter.org`** and follow Vercel's DNS instructions. Confirm the domain isn't already pointed at an old project before repointing it.

---

## 3. Post-deploy smoke checklist

Once `style.perimeter.org` resolves, verify in a browser:

- [ ] **Routes load and deep-link.** Visit `/`, then hard-reload directly on `/tokens`, `/components/button`, and `/guides/styling-widgets` — each renders (proves the SPA-fallback rewrite is live; without it these 404).
- [ ] **A widget mounts against the production API.** Open a widget route (e.g. `/widgets/sermons`) — the preview mounts through the real `mount()` and pulls live data from `api.perimeter.org` (sermons is public, no auth). No console errors; no host-page CSS bleed into the shadow root.
- [ ] **`/tokens` renders the live design-token reference** — color swatches, radii, and type scale each show their CSS-variable name and default.
- [ ] **Components render through the shadow-DOM stage.** A `/components/:name` page shows its MDX doc with live examples (or the auto-gallery fallback for components without a doc).
- [ ] **The dev-only built-bundle preview is absent** — the deployed site is the clean read-only gallery; the source ⇄ built-bundle toggle only exists under `import.meta.env.DEV`.

Any failure (a route 404s on reload, a preview white-screens, tokens don't render) is a **no-go** — fix on a branch, re-deploy, and re-run this checklist before announcing the site.

---

## 4. Updating the site

The site auto-deploys from `main` (and preview-deploys per PR), so it tracks the design system automatically: merge component MDX docs, new guides, new widgets, or token changes through the normal `dev → main` flow and the gallery updates on the next production deploy. No manual publish step.
