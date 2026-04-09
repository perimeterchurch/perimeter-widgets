# Style Registry Sync: Components & Tokens

> **Date:** 2026-04-08
> **Scope:** perimeter-widgets — consuming components and tokens from style project's shadcn registry
> **Authority:** style project (`style.perimeter.org/r`) is the single source of truth for all primitive components and design tokens

---

## Context

The perimeter-widgets shared package contains 26 UI primitive components (badge, button, card, dialog, etc.) that are hand-copied duplicates of identically-named components in the style project. Design tokens (OKLCH color values, radius, etc.) are also manually duplicated. When style updates a component or token, widgets doesn't know and drifts silently.

The style project already publishes a shadcn-compatible registry at `https://style.perimeter.org/r` with full component source code and theme tokens. shadcn CLI 3.0+ supports namespaced registries, allowing consumers to pull components via `pnpm dlx shadcn@latest add @perimeter/button`.

## Design Principles

1. **Style owns all primitives** — component source, variants, tokens, and design decisions live in the style repo
2. **Widgets pulls verbatim** — primitive components are pulled from the registry unchanged
3. **Widgets composes freely** — widget-specific components (`MediaCard`, `SermonGrid`, `IconSelect`, `SortSelect`) compose primitives but are owned by widgets
4. **Design changes flow one direction** — style → registry → widgets, never the reverse
5. **Sync is intentional** — developer runs sync command manually, not automated in CI

## What Gets Synced (21 components)

These 21 primitives exist in both projects and will be replaced by registry pulls:

`avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`, `command`, `empty`, `input`, `input-group`, `label`, `pagination`, `progress`, `radio-group`, `scroll-area`, `separator`, `skeleton`, `spinner`, `switch`, `tabs`, `textarea`

## What Stays in Widgets (not synced)

- **Shadow DOM portal components (6):** `dialog.tsx`, `combobox.tsx`, `select.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `multi-combobox.tsx` — these have `usePortalContainer()` customizations that redirect Base UI portals into the shadow root instead of `document.body`. The registry versions lack this. These stay widget-owned until style adds a `container` prop passthrough that supports shadow DOM contexts, at which point they can be synced.
- **Widget-specific compositions:** `icon-select.tsx`, `sort-select.tsx` — custom components not in the style registry
- **Base UI wrappers:** `ui/button.tsx`, `ui/dialog.tsx`, `ui/input.tsx`, `ui/textarea.tsx` — thin wrappers with widget-specific re-exports
- **Motion components:** `AnimatedList`, `FadeIn`, `SlideUp`, `ScaleIn`, `CountUp`, `SkeletonTransition`, `AnimatedPanel`
- **Widget-specific CSS:** `:host` shadow DOM reset, `@custom-variant dark`, shimmer animation, `@theme inline` Tailwind mapping, scrollbar utility
- **All widget business logic:** hooks, views, types, storyboard

### Future: Portal-aware components in style

The 6 portal components should eventually be updated in the **style** project to accept an optional `container` prop (defaulting to `document.body`). This would make them work in both normal DOM and shadow DOM contexts without any widget-specific modifications. Once style publishes portal-aware versions, widgets can sync these 6 components too and remove its custom copies.

## Implementation

### 1. Add components.json to shared package

Create `packages/shared/components.json` — minimal consumer config:

```json
{
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "base-nova",
    "tsx": true,
    "tailwind": {
        "config": "",
        "css": "src/styles/base.css",
        "cssVariables": true
    },
    "aliases": {
        "utils": "@/lib/utils",
        "ui": "@/components/ui"
    },
    "registries": {
        "@perimeter": "https://style.perimeter.org/r/{name}.json"
    }
}
```

This tells the shadcn CLI where the registry lives and where to write files. It does NOT define components — style owns that.

### 2. Add sync script

Add to `packages/shared/package.json`:

```json
"sync:style": "pnpm dlx shadcn@latest add @perimeter/avatar @perimeter/badge @perimeter/button @perimeter/calendar @perimeter/card @perimeter/checkbox @perimeter/command @perimeter/empty @perimeter/input @perimeter/input-group @perimeter/label @perimeter/pagination @perimeter/progress @perimeter/radio-group @perimeter/scroll-area @perimeter/separator @perimeter/skeleton @perimeter/spinner @perimeter/switch @perimeter/tabs @perimeter/textarea && node scripts/post-sync.mjs"
```

Also add to root `package.json`:

```json
"sync:style": "pnpm --filter=@perimeter-widgets/shared sync:style"
```

### 3. Token sync via script (not CLI theme merge)

Tokens are synced separately from components using a dedicated script, **not** the shadcn CLI theme install. The CLI's theme merge writes to `:root` / `.dark` selectors, but widgets needs `:root, :host` and `.dark, :host([data-theme="dark"])` for shadow DOM. The `@theme inline` block, `@custom-variant dark`, shadow DOM `:host` reset, animations, and scrollbar utility must be preserved.

**Approach:** Marker-based replacement in `base.css`. Add markers around the token section:

```css
/* @sync:tokens-start */
:root, :host {
    --radius: 0.625rem;
    --background: oklch(0.985 0.002 75);
    ...
}
.dark, :host([data-theme="dark"]) {
    ...
}
/* @sync:tokens-end */
```

The `sync:tokens` script (`scripts/sync-tokens.mjs`):

1. Fetches `https://style.perimeter.org/r/default-theme.json`
2. Extracts `cssVars.light` and `cssVars.dark` objects
3. Generates `:root, :host { ... }` and `.dark, :host([data-theme="dark"]) { ... }` blocks
4. Replaces content between markers in `base.css`
5. Preserves all other CSS (`:host` reset, `@custom-variant`, `@theme inline`, animations)

Add to `packages/shared/package.json`:

```json
"sync:tokens": "node scripts/sync-tokens.mjs"
```

### 4. Post-sync import path rewriting

The shared package uses relative imports (not path aliases) because it's consumed cross-package — this is a project convention that cannot change. Registry components use `@/lib/utils` and `@/components/ui/...` aliases.

**Solution:** The `post-sync.mjs` script (called at the end of `sync:style`) rewrites all `@/` imports in synced component files to relative paths:

- `@/lib/utils` → relative path to `../../../lib/utils` (or appropriate depth based on file location)
- `@/components/ui/perimeter/button` → `./button` (same directory)
- `@/components/ui/input-group` → `../input-group` (parent directory)

The script walks all `.tsx` files in the synced directories, finds `@/` imports, and rewrites them based on the file's location relative to `src/`.

### 5. Replace hand-copied components

- Delete the 21 files in `packages/shared/src/components/ui/perimeter/` that are in the sync list (plus `input-group` in `ui/`)
- Run `pnpm sync:style` to pull fresh copies from the registry + run post-sync import rewrite
- Run `pnpm sync:tokens` to pull fresh token values
- Verify build: `pnpm typecheck && pnpm test && pnpm build`
- The 6 portal components + 2 widget-specific compositions remain untouched

### 6. Verify build pipeline

After sync:

- `pnpm typecheck` — ensure all imports resolve
- `pnpm test` — ensure existing tests pass
- `pnpm build` — ensure IIFE widget builds still produce working bundles
- Manual check in storyboard (`pnpm dev`) — components render correctly

## Ongoing Workflow

When a design change is needed:

1. Developer updates the component in the **style repo**
2. Style CI builds and deploys the registry to `style.perimeter.org/r`
3. Developer runs `pnpm sync:style` and `pnpm sync:tokens` in **perimeter-widgets**
4. Pulled components overwrite existing files, post-sync script rewrites imports
5. Developer verifies widgets still work (`pnpm quality`, visual check)
6. Developer commits the synced files and any composition adjustments

## Risks and Mitigations

| Risk                                                              | Mitigation                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| CLI writes `@/` path aliases that don't resolve in shared package | `post-sync.mjs` rewrites all `@/` imports to relative paths after every sync                      |
| Token sync overwrites shadow DOM selectors                        | Marker-based replacement in `base.css` — only content between `@sync:tokens-start/end` is touched |
| Portal components break in shadow DOM after sync                  | 6 portal components excluded from sync list — stay widget-owned until style adds `container` prop |
| Style adds a breaking prop change to a primitive                  | Sync is manual — developer reviews diff before committing                                         |
| CLI version changes behavior                                      | Pin shadcn CLI version in sync script                                                             |
| Registry is down when syncing                                     | Components are committed to git — last synced version always works                                |

## Out of Scope

- Automated CI sync (intentionally manual)
- Publishing widgets components back to style registry
- Consuming motion components from style (widget-specific, not in registry)
- Consuming `icon-select` or `sort-select` from style (widget-specific compositions)
