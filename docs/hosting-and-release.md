# Hosting & Release

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

## Creating a widget

Scaffold a new widget with `pnpm create-widget <name>` (also in the `@perimeter/release` package). It renders `widgets/<name>/` from a real template (`package.json` at `0.0.0`, `vite.config.ts` with `widgetConfig({ name })`, the `src/` and `tests/` files), writes a stub `docs/widgets/<name>.mdx`, and runs `pnpm install` so the workspace graph picks up the new package. The workspace globs `widgets/*`, so there is no `pnpm-workspace.yaml` edit.

> **Commit the updated `pnpm-lock.yaml`** the scaffold produces. The bump release below guards on a clean working tree, so an uncommitted lockfile would block it later.

Full on-ramp + per-file walkthrough: [Creating a widget](./creating-a-widget.md).

## `pnpm release <name>`

The release CLI lives in the `@perimeter/release` workspace package (`packages/release/`), so its logic is unit-tested inside the same `pnpm quality` gate as everything else. **Pure helpers** (version bump, branch name, PR body, manifest/rewrite/prune logic) are in `src/release.ts` and are fully unit-tested; the thin imperative **side-effect** entry (`fs` writes, `execSync` for `pnpm`/`git`/`gh`) is `src/cli.ts`. The root `package.json` wires `"release": "tsx packages/release/src/cli.ts"`.

There are two modes.

### Bare `pnpm release <name>` (unchanged — the batched/manual path)

```
pnpm release <widget-name> [--force]
```

The original behavior, untouched. It uses the version **already in** `widgets/<name>/package.json` (set by hand), commits to the current branch, and does **not** push or open a PR. In order:

1. Reads the widget version from `widgets/<name>/package.json`.
2. Refuses if `cdn/<name>/<version>/` already exists (immutable) — bump the version, or pass `--force`.
3. Builds the widget (`pnpm --filter @perimeter/widget-<name> build`).
4. Copies `widgets/<name>/dist/index.js` (+ `.map`) to the immutable `cdn/<name>/<version>/`.
5. Updates `cdn/manifest.json` to point `<name>` at `<version>`.
6. Regenerates the `rewrites` in `cdn/vercel.json` from the manifest (headers untouched).
7. Prunes the widget's version directories to the newest 5.
8. Commits everything under `cdn/` as `chore(release): <name>@<version>`.

To ship a bare release: push the branch and open a PR into `dev` yourself.

### `pnpm release <name> --patch|--minor|--major` (one-command release)

```
pnpm release <widget-name> --patch | --minor | --major [--dry-run]
```

The one-command path. It does everything above **plus** owns the version bump and the branch/push/PR mechanics:

1. Guards: the working tree must be clean (uncommitted changes abort), then `git fetch origin`.
2. Branches off `origin/dev` as `release/<name>-<newVersion>`.
3. Bumps `widgets/<name>/package.json` by the chosen level (`--patch`/`--minor`/`--major`).
4. Runs the same shared core: build → copy to immutable `cdn/<name>/<version>/` → manifest + rewrites → prune to 5.
5. Commits the bump + `cdn/` changes as `chore(release): <name>@<version>`.
6. Pushes the branch and opens a PR into `dev` via `gh pr create --body-file` (generated body: version, gzipped bundle size, promote/rollback notes). You just review and merge.

Add `--dry-run` to preview the planned version, branch, commit message, PR title, and PR body with **no** file writes, build, git, or `gh` side effects — useful in CI and before a real run. The bare form also accepts `--dry-run` to preview without committing.

> The committed bundle artifacts (`cdn/*/*/index.js` and `.map`) are listed in `.prettierignore` — they are kept byte-for-byte as built and must never be reformatted.

## Promote

A promotion is just the `manifest.json` change (and the regenerated `latest.js` rewrite) landing on `dev`. With `pnpm release <name> --patch|--minor|--major` the branch and PR are opened for you — just merge the PR into `dev`. (With the bare `pnpm release <name>`, push the branch and open the PR yourself.) Once merged and deployed, the edge picks up the new manifest within ~a minute and `loader.js` (and any `latest.js` consumers) resolve to the new version. Old direct-versioned `<script>` URLs keep working until pruned. The batched `dev → main` release-PR flow is unchanged.

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
<!-- pin to a specific immutable version; the number here is illustrative -->
<script src="https://widgets.perimeter.org/example/0.0.1/index.js" async></script>
```

Each widget self-mounts into a shadow root on load.

### Dark mode (`data-theme="dark"`)

Widgets default to the light palette. Opt a single embed into dark mode with `data-theme="dark"` on the target element:

```html
<div data-perimeter-widget="sermons" data-theme="dark"></div>
```

Dark mode is a pure CSS-variable swap: `@perimeter/theme` ships a `darkTokens` set (the same token keys as the light defaults), and the per-instance token sheet emits both a `:host { … }` (light) block and a `:host([data-theme="dark"]) { … }` (dark) block. Setting `data-theme="dark"` on the shadow host activates the dark block with zero mount-time parsing — omit the attribute (or set any other value) for light. Every widget that styles with semantic token utilities (`bg-bg`, `text-fg`, `border-border`, …) cascades to dark automatically; hard-coded colors do not.

> **Constraint: widget schemas must stay non-strict.** A bare `data-theme` is not a `data-theme-*` token override, so the data-attrs parser surfaces it as a `theme` config key. A non-strict zod object schema (the default — `z.object({...})` without `.strict()`) silently strips the unknown key during `schema.parse`, and the attribute itself is never removed from the host element, so activation still works. A `.strict()` schema would instead **reject** the embed. Keep widget schemas non-strict.

## Deployment status

`cdn/` is **live in production**: it is deployed as a standalone Vercel static project (root directory = `cdn/`, no build command) serving `widgets.perimeter.org`, and the sermons widget is embedded on the WordPress site via the loader. New releases reach production through the normal `dev → main` release-PR flow — `pnpm release <name> --patch|--minor|--major` opens the PR, and merging it publishes the immutable bundle + updated manifest pointer.

The Vercel project settings for the static host live in `cdn/README.md`; deploying the showcase studio at `style.perimeter.org` is covered separately in [deploying-studio.md](./deploying-studio.md).
