# CDN & Deployment

> **Scope:** jsDelivr serving, cache purging, GitHub Action, rollback
> **Key files:** `.github/workflows/build-and-purge.yml`, `scripts/generate-manifest.ts`, `dist/manifest.json`
> **Last verified:** 2026-03-18

---

## CDN Serving

Built widget files in `dist/` are committed to the repo and served via jsDelivr directly from GitHub.

### Widget URLs

```
https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/sermons/sermons.js
```

Pattern: `https://cdn.jsdelivr.net/gh/<org>/<repo>@latest/dist/<widget>/<widget>.js`

### jsDelivr Caching

| Reference | Cache Duration     | Use Case                      |
| --------- | ------------------ | ----------------------------- |
| `@latest` | 7 days (purgeable) | Production — WordPress embeds |
| `@v1.0.0` | Permanent (1 year) | Pinned version (optional)     |
| `@main`   | 12 hours           | Development/testing           |

WordPress embeds use `@latest` and never need to change their script tags. Cache is purged on every build via GitHub Action.

---

## Build Manifest

`scripts/generate-manifest.ts` runs as a `postbuild` hook after `pnpm build`. It scans `dist/` and writes `dist/manifest.json`:

```json
{
    "widgets": {
        "sermons": {
            "file": "dist/sermons/sermons.js",
            "sizeBytes": 230822
        }
    }
}
```

The GitHub Action reads this to know which files to purge from jsDelivr.

---

## GitHub Action: Build & Purge

**File:** `.github/workflows/build-and-purge.yml`

**Triggers:** Push to `main`

### Pipeline

1. **Install** — `pnpm install --frozen-lockfile`
2. **Build** — `pnpm build` (Turborepo builds all widgets + generates manifest)
3. **Check** — `git diff --quiet dist/` to detect changes
4. **Commit** — If changed, commit `dist/` as `github-actions[bot]`
5. **Push** — Push the dist commit
6. **Purge** — Hit `https://purge.jsdelivr.net/gh/...` for each widget file in manifest

The purge endpoint is public — no API key required.

---

## Rollback Procedure

Since WordPress embeds use `@latest`, a broken build affects production immediately. To roll back:

1. `git revert <broken-commit>` — reverts the dist changes
2. Push to `main`
3. GitHub Action purges jsDelivr cache for affected files
4. jsDelivr serves the reverted (known-good) dist files

For extra safety, you can optionally pin WordPress embeds to a tagged version (`@v1.0.0`) and only update the tag after verifying.

---

## WordPress Embed

```html
<div id="perimeter-sermons" data-campus="buckhead" data-per-page="12">
    <div style="min-height:200px;background:#f5f5f4;border-radius:8px"></div>
</div>
<script src="https://cdn.jsdelivr.net/gh/PerimeterChurch/perimeter-widgets@latest/dist/sermons/sermons.js"></script>
```

The inner `<div>` is an optional loading placeholder — replaced when the widget mounts.

Set once, never change. Updates are delivered via the CDN automatically.

---

## Related Docs

- [Architecture Overview](overview.md) — Build pipeline context
- [Widget Embed Guide](../reference/embed-guide.md) — Full embed reference
