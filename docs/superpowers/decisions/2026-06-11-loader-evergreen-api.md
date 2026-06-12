# Decision: loader.js + manifest.json are the public evergreen embed API

**Date:** 2026-06-11
**Status:** Adopted
**Origin:** 2026-06-10 platform tooling audit, roadmap item 6 (deferred item 2). The
audit's Stripe/Intercom comparison (verified 9-0) found the repo already runs the
industry evergreen pattern — a mutable entry point over immutable artifacts — but
nothing declared it a contract. This document does.

## The contract

Host pages may reference exactly two evergreen URLs:

| URL | Role | Mutability |
| --- | --- | --- |
| `https://widgets.perimeter.org/loader.js` | The blessed embed entry point | Mutable, edge-cached `s-maxage=60` + SWR |
| `https://widgets.perimeter.org/<name>/latest.js` | Per-widget evergreen alias (rewrite to the current versioned bundle) | Pointer regenerated per release |

Everything else a host page touches is **immutable**: `cdn/<name>/<version>/index.js`
is never overwritten once published (release CLI enforces this), and is served with
`max-age=31536000, immutable`. `manifest.json` is the single mutable pointer the
loader resolves through; host pages don't reference it directly, but its schema
(`{ "<name>": "<version>" }`) is part of the contract because the loader's deployed
copies read it forever.

### Embed-surface guarantees

The loader's observable behavior is frozen as public API. Changes to any of these
require treating WordPress (and any other host) as a consumer to migrate, not an
internal caller:

- `<div data-perimeter-widget="<name>">` is the placeholder selector; each named
  widget's bundle is injected **once** per page (first placeholder wins).
- Unknown widget names are skipped silently; loader failures never break the host
  page (the whole chain is wrapped in a silent catch).
- `data-theme`, `data-theme-*` token overrides, and zod-validated `data-*` config
  attributes on the placeholder are read by the widget bundle, not the loader, and
  carry their own compatibility story (non-strict schemas — see
  `docs/hosting-and-release.md`).
- `data-nowprocket` on the loader `<script>` tag is part of the documented snippet
  (WP Rocket Delay JS hardening, PR #118).

## Rollback semantics

Rollback is a **pointer revert**, never an artifact change:

1. `git revert` the `chore(release): <name>@<version>` commit (manifest pointer +
   regenerated `latest.js` rewrite move back together) and merge to `dev`, then ship
   through the normal release-PR flow. Edge propagation ≈ 1 minute (`s-maxage=60`).
2. Faster, infra-level: Vercel Instant Rollback on the static project.

Both work because prior versioned bundles remain committed and immutable — a host
page that cached the old bundle URL keeps working; a fresh load resolves the
reverted pointer. The last-5 prune bounds how far back a pointer can move (older
versions are intentionally retired).

## Canary semantics (adopted with this decision)

`data-perimeter-version="<version>"` on a placeholder div pins **that widget on that
page** to a specific immutable bundle, bypassing the manifest pointer:

```html
<script src="https://widgets.perimeter.org/loader.js" data-nowprocket async></script>
<div data-perimeter-widget="sermons" data-perimeter-version="1.4.0"></div>
```

- Intended use: point a staging/preview page at a freshly published version before
  promoting the manifest pointer, or canary one production page ahead of the rest.
- First placeholder per widget name wins (the loader loads one bundle per name).
- An explicit version works even for a name absent from the manifest, enabling
  pre-promotion testing of a brand-new widget.
- A typo'd version 404s and the widget silently doesn't render — same failure
  posture as every other loader path (never break the host page).

Unit coverage: `packages/parity/tests/loader.test.ts`; the end-to-end browser flow
is `packages/parity/visual/visual-parity.spec.ts`.

## What this is not

- Not a release train (Stripe's `/v3/` URL versioning). One evergreen loader is
  enough at this scale; if a breaking loader change is ever unavoidable, mint
  `loader2.js` rather than breaking deployed snippets.
- Not an SLA on bundle internals. Only the surfaces named above are contractual;
  widget DOM, CSS, and chunk layout may change freely between versions.
