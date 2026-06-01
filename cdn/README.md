# Perimeter Widgets CDN (`cdn/`)

This directory is a **standalone Vercel static project** deployed at
`widgets.perimeter.org`. It holds the committed, immutable widget bundles plus
the single mutable pointer (`manifest.json`) and the static config
(`vercel.json`).

## Layout

```
cdn/
├── vercel.json            # cache headers (static) + rewrites (regenerated from manifest)
├── manifest.json          # { "<name>": "<version>" } — the single mutable pointer
├── loader.js              # global loader (manifest-driven, dedupe)
├── README.md              # this file
└── <name>/<version>/index.js (+ .map)   # immutable, committed bundles
```

- **Versioned paths are immutable.** `cdn/<name>/<version>/index.js` (+ `.map`)
  is never overwritten. The release CLI refuses to republish an existing version
  unless `--force`, and prunes each widget to the last 5 versions.
- **`manifest.json` is the only mutable pointer.** It maps each widget name to
  its current version. `loader.js` reads it to resolve the bundle URL.
- **`vercel.json` ownership:** the `headers` block is authored once (static). The
  `rewrites` array is **regenerated from `manifest.json`** by `pnpm release` on
  every release — one `/<name>/latest.js` → current-version rewrite per manifest
  entry. Do not hand-edit `rewrites`.

## Maintenance

`manifest.json` and the `vercel.json` `rewrites` are maintained by the release
CLI:

```
pnpm release <widget-name> [--force]
```

It builds the widget, copies the artifact to the immutable path, updates the
manifest + rewrites, prunes old versions, and commits.

## Deploy (one-time manual step)

This directory deploys as **its own** Vercel static project (separate from the
showcase site):

1. Create a new Vercel project linked to this repo, with **root directory =
   `cdn/`** and **no build command** (serve the directory as-is).
2. Attach the `widgets.perimeter.org` domain to that project.

No database, no Blob, no build step. Promotion is a `manifest.json` change merged
via PR; rollback is reverting that commit or using Vercel Instant Rollback.
