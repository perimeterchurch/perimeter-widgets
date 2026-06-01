# Hosting & Release (Phase 3)

How Perimeter widgets are hosted, versioned, released, promoted, and rolled back.

No database, no Blob, no admin UI — the whole story is a committed static directory plus a small release CLI. Promotion and rollback are git operations.

## The `cdn/` static directory

`cdn/` is a plain static directory deployed as **its own Vercel static project** at `widgets.perimeter.org` (separate from the showcase site at `style.perimeter.org`). It holds the committed, immutable widget bundles, the single mutable pointer, and the static Vercel config.

```
cdn/
├── vercel.json                       # cache headers (static) + rewrites (regenerated from manifest)
├── manifest.json                     # { "<name>": "<version>" } — the single mutable pointer
├── loader.js                         # global loader (manifest-driven, lazy-load + dedupe)
├── README.md                         # deploy notes for the static project
└── <name>/<version>/index.js (+ .map)  # immutable, committed bundles
```

- **Versioned paths are immutable.** `cdn/<name>/<version>/index.js` (+ `.map`) is never overwritten once published. The release CLI refuses to republish an existing version unless `--force`.
- **Last-5 prune.** Each release prunes the widget's own version directories to the newest 5 (semver-ordered), so the committed history doesn't grow unbounded. Older immutable URLs are intentionally retired.
- **`manifest.json` is the only mutable pointer.** It maps each widget name to its current version. `loader.js` reads it to resolve which immutable bundle URL to inject.
- **`vercel.json` ownership.** The `headers` block is authored once (static). The `rewrites` array is **regenerated from `manifest.json`** by the release CLI on every release — one `/<name>/latest.js` → current-versioned-bundle rewrite per manifest entry. Never hand-edit `rewrites`; a test (`packages/release/tests/vercel-config.test.ts`) asserts it stays in sync with the manifest.

### Cache headers

| Path                              | `Cache-Control`                                                | CORS |
| --------------------------------- | -------------------------------------------------------------- | ---- |
| `/<name>/<version>/index.js(.map)` | `public, max-age=31536000, immutable`                          | `*`  |
| `/manifest.json`                  | `public, max-age=0, s-maxage=60, stale-while-revalidate=86400` | `*`  |
| `/<name>/latest.js`               | `public, max-age=0, s-maxage=60, stale-while-revalidate=86400` | `*`  |
| `/loader.js`                      | `public, max-age=0, s-maxage=60, stale-while-revalidate=86400` | `*`  |

Versioned bundles are cached for a year because their URL changes on every release. The manifest, the `latest.js` rewrites, and the loader are short-lived at the edge (`s-maxage=60` + SWR) so a manifest change propagates within ~a minute. `Access-Control-Allow-Origin: *` is set on every response because these load cross-origin from WordPress.

## `pnpm release <name>`

The release CLI lives in the `@perimeter/release` workspace package (`packages/release/`), so its logic is unit-tested inside the same `pnpm quality` gate as everything else. Pure helpers are in `src/release.ts`; the thin imperative entry is `src/cli.ts`. The root `package.json` wires `"release": "tsx packages/release/src/cli.ts"`.

```
pnpm release <widget-name> [--force]
```

What it does, in order:

1. Reads the widget version from `widgets/<name>/package.json`.
2. Refuses if `cdn/<name>/<version>/` already exists (immutable) — bump the version, or pass `--force`.
3. Builds the widget (`pnpm --filter @perimeter/widget-<name> build`).
4. Copies `widgets/<name>/dist/index.js` (+ `.map`) to the immutable `cdn/<name>/<version>/`.
5. Updates `cdn/manifest.json` to point `<name>` at `<version>`.
6. Regenerates the `rewrites` in `cdn/vercel.json` from the manifest (headers untouched).
7. Prunes the widget's version directories to the newest 5.
8. Commits everything under `cdn/` as `chore(release): <name>@<version>`.

It does **not** push or open a PR — that's a human step. To ship a release: push the branch and open a PR into `dev`.

> The committed bundle artifacts (`cdn/*/*/index.js` and `.map`) are listed in `.prettierignore` — they are kept byte-for-byte as built and must never be reformatted.

## Promote

A promotion is just the `manifest.json` change (and the regenerated `latest.js` rewrite) landing on the deployed branch. Run `pnpm release <name>` on a feature branch, open a PR, and merge. Once deployed, the edge picks up the new manifest within ~a minute and `loader.js` (and any `latest.js` consumers) resolve to the new version. Old direct-versioned `<script>` URLs keep working until pruned.

## Roll back

Two options, both fast:

- **Revert the commit.** `git revert` the `chore(release): <name>@<version>` commit (or the manifest change) and merge — the manifest points back at the prior version. Because the prior versioned bundle is still committed and immutable, it just works.
- **Vercel Instant Rollback.** Roll the static project back to the previous deployment from the Vercel dashboard.

## Embedding

**Direct (pin to a name; always current via the loader-resolved version):** use the global loader and a placeholder div.

```html
<script src="https://widgets.perimeter.org/loader.js" async></script>
<div data-perimeter-widget="sermons"></div>
```

The loader fetches `manifest.json`, scans the page for `[data-perimeter-widget="<name>"]`, and injects each used widget's immutable versioned bundle once (deduped by name). Unknown widget names are skipped silently so the loader never breaks a host page.

**Pinned to a specific immutable version (no loader):** point a script tag straight at a versioned bundle.

```html
<script src="https://widgets.perimeter.org/example/0.0.0/index.js" async></script>
```

Each widget self-mounts into a shadow root on load.

## One-time manual deploy (remaining step)

`cdn/` is **not yet deployed**. This plan produced and verified the directory, the release CLI, and the first committed releases locally; standing up the live host is a manual step (needs the Vercel account):

1. Create a new Vercel project linked to this repo, with **root directory = `cdn/`** and **no build command** (serve the directory as-is).
2. Attach the `widgets.perimeter.org` domain to that project.

No production embed has changed; the WordPress cutover to `widgets.perimeter.org` is a separate phase (Phase 4).

### Deferred live-browser verification

The local checks (a self-contained node server smoke test and the `vercel.json`-sync test) confirm the files serve and the bundle/loader contents are correct. Two checks can't run headlessly and are **deferred to a human** once `cdn/` is served:

1. A direct `<script src=".../example/0.0.0/index.js">` renders cards inside a shadow root.
2. `<script src=".../loader.js">` + `<div data-perimeter-widget="sermons">` mounts the sermons widget.
