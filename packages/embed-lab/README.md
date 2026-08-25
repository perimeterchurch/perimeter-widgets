# @perimeter/embed-lab

A local host-page playground for manually testing widget embeds. Dev-only; nothing ships.

```bash
pnpm embed-lab          # from the repo root
# → http://localhost:4400
```

The lab serves real artifacts behind one origin:

- **Released** — `/loader.js`, `/manifest.json`, and `/<name>/<version>/*` pass through to
  the repo's committed `cdn/` directory: byte-for-byte what widgets.perimeter.org serves,
  including the loader → manifest resolution and sibling artifacts (sermons'
  `pdf.worker.min.mjs`).
- **Local** — `/local/<name>/*` serves `widgets/<name>/dist/` for testing a build that has
  not been released yet (`pnpm --filter @perimeter/widget-<name> build` first).

## Pages

| Page                                    | Exercises                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pages/basic.html`                     | The documented embed snippet, light theme                                                                                                                 |
| `/pages/dark.html`                      | `data-theme="dark"` on a dark host page                                                                                                                   |
| `/pages/hostile-host.html`              | perimeter.org's measured host styles + hostile global CSS (shadow isolation)                                                                              |
| `/pages/theme-overrides.html`           | Per-embed `data-theme-*` token overrides incl. the type scale                                                                                             |
| `/pages/canary.html`                    | `data-perimeter-version` pinning next to the manifest-resolved version                                                                                    |
| `/pages/narrow.html`                    | 360px sidebar container (compact responsive presentation)                                                                                                 |
| `/pages/multi.html`                     | Two widgets, one loader tag (per-name dedupe, independent themes)                                                                                         |
| `/pages/local.html`                     | Direct embed of the local `dist/` build, no loader                                                                                                        |
| `/pages/local-staff-directory.html`     | The local `staff-directory` build on a hostile host (img / ul-li / form-field leaks)                                                                      |
| `/pages/local-prayer-wall.html`         | The local `prayer-wall` build on a hostile host (form / radio / fieldset leaks)                                                                           |
| `/pages/local-mission-trip-finder.html` | The local `mission-trip-finder` build on a hostile host: browse → detail state, plus a `data-trip-id` pinned embed (ul-li / img leaks, roster visibility) |

Widgets fetch live data from `https://api.perimeter.org` (the built bundle's default), so
pages need internet access. Add `data-api-url="http://localhost:5500"` to a placeholder to
target a local perimeter-api.

Everything is served `no-store`, so a new release (`pnpm release <name>`) or a rebuild shows
on plain reload.
