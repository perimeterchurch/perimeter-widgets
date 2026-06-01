# CDN & Deployment

> **Scope:** Static `cdn/` Vercel project, immutable versioned bundles, release CLI, promote/rollback
> **Key files:** `cdn/`, `cdn/manifest.json`, `cdn/vercel.json`, `packages/release/`
> **Canonical source:** [`docs/hosting-and-release.md`](../hosting-and-release.md)

---

## Model

Widgets are served from `cdn/` — a committed static directory deployed as its **own** Vercel static project at `widgets.perimeter.org` (separate from the showcase site at `style.perimeter.org`). There is no external CDN, no cache-invalidation step, and no GitHub Action build pipeline; the static project serves the committed files directly.

- Each widget builds to `widgets/<name>/dist/index.js` (via `widgetConfig`).
- `cdn/<name>/<version>/index.js` (+ `.map`) is **immutable** once published — its `Cache-Control` is `public, max-age=31536000, immutable`.
- `cdn/manifest.json` (`{ "<name>": "<version>" }`) is the single mutable pointer.
- `cdn/vercel.json` holds the static cache/CORS `headers` plus the `/<name>/latest.js` → current-versioned-bundle `rewrites`, which are regenerated from the manifest on every release.

## Release

`pnpm release <name>` (the `@perimeter/release` package) builds the widget, copies the bundle into the immutable `cdn/<name>/<version>/`, updates `manifest.json` + the `latest.js` rewrites, prunes each widget to its newest 5 versions, and commits `chore(release): <name>@<version>`. It does **not** push or open a PR.

## Promote / roll back

- **Promote:** merge the manifest change. The edge picks it up within ~a minute (`s-maxage=60` + SWR).
- **Roll back:** `git revert` the release commit (the prior immutable bundle still serves), or use Vercel Instant Rollback on the static project.

---

Full flow, headers, and embed snippets: [`docs/hosting-and-release.md`](../hosting-and-release.md).
