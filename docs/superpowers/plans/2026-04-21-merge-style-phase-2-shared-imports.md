# Merge Style — Phase 2: Shared Imports From Registry Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Switch `packages/shared/` from its hand-synced copy of the 26-item UI subset to workspace imports from `@perimeter-widgets/registry`, retire the sync pipeline, and keep the three widget-original files (`icon-select`, `sort-select`, `portal-wrappers`) intact.

**Architecture:** Shared's barrel (`src/components/index.ts`) re-points every synced-component `export *` at the workspace registry. The three widget-originals stay local; `portal-wrappers` has its sibling imports (`./dialog`, `./combobox`, etc.) rewritten to `@perimeter-widgets/registry`. The five thin base wrappers at `src/components/ui/{button,dialog,input,input-group,textarea}.tsx` and the entire synced-copy tree at `src/components/ui/perimeter/` (minus the 3 originals) are deleted. `sync:style`, `sync:tokens`, and their backing scripts are removed.

**Tech Stack:** Turborepo, pnpm workspaces, TypeScript, Vite.

**Spec:** `docs/superpowers/specs/2026-04-20-merge-style-into-widgets-design.md`

**Branch:** `feat/shared-imports-from-registry` off `dev`.

---

## File Map

| Action | File                                                              | Notes                                                                                                                                    |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Modify | `packages/shared/package.json`                                    | Add `@perimeter-widgets/registry: workspace:*`; remove `sync:style`/`sync:tokens` scripts                                                |
| Modify | `packages/shared/src/components/index.ts`                         | Rewrite: all synced-registry `export *` → from `@perimeter-widgets/registry`; keep the three widget-originals local                      |
| Modify | `packages/shared/src/components/ui/perimeter/portal-wrappers.tsx` | Sibling imports `./dialog`, `./combobox`, `./select`, `./dropdown-menu`, `./tooltip`, `./multi-combobox` → `@perimeter-widgets/registry` |
| Delete | `packages/shared/src/components/ui/button.tsx`                    | Wrapper duplicate                                                                                                                        |
| Delete | `packages/shared/src/components/ui/dialog.tsx`                    | Wrapper duplicate                                                                                                                        |
| Delete | `packages/shared/src/components/ui/input.tsx`                     | Wrapper duplicate                                                                                                                        |
| Delete | `packages/shared/src/components/ui/input-group.tsx`               | Wrapper duplicate                                                                                                                        |
| Delete | `packages/shared/src/components/ui/textarea.tsx`                  | Wrapper duplicate                                                                                                                        |
| Delete | `packages/shared/src/components/ui/perimeter/*.tsx`               | Synced copy — EXCEPT `icon-select.tsx`, `sort-select.tsx`, `portal-wrappers.tsx`                                                         |
| Delete | `packages/shared/scripts/sync-components.mjs`                     |                                                                                                                                          |
| Delete | `packages/shared/scripts/sync-tokens.mjs`                         |                                                                                                                                          |
| Delete | `packages/shared/scripts/post-sync.mjs`                           |                                                                                                                                          |
| Modify | `package.json` (root)                                             | Remove `sync:style` and `sync:tokens` pass-throughs                                                                                      |

Kept in place:

- `packages/shared/src/components/ui/perimeter/icon-select.tsx` — widget-original; already uses `../../../lib/utils` (no edits)
- `packages/shared/src/components/ui/perimeter/sort-select.tsx` — widget-original; already uses `../../../lib/utils` (no edits)
- `packages/shared/src/components/ui/perimeter/portal-wrappers.tsx` — widget-original; imports to sibling synced files are rewritten (see above)

---

## Chunk 1: Delete wrappers + synced copies + retired scripts

### Task 1: Remove the five top-level wrapper files

```bash
git rm packages/shared/src/components/ui/button.tsx
git rm packages/shared/src/components/ui/dialog.tsx
git rm packages/shared/src/components/ui/input.tsx
git rm packages/shared/src/components/ui/input-group.tsx
git rm packages/shared/src/components/ui/textarea.tsx
```

- [ ] Commit: `chore(shared): remove base UI wrapper duplicates (registry versions will replace them)`

### Task 2: Delete synced registry files, keep widget-originals

```bash
# Move the three we're keeping out of the way
mv packages/shared/src/components/ui/perimeter/icon-select.tsx /tmp/icon-select.tsx
mv packages/shared/src/components/ui/perimeter/sort-select.tsx /tmp/sort-select.tsx
mv packages/shared/src/components/ui/perimeter/portal-wrappers.tsx /tmp/portal-wrappers.tsx

# Delete everything else
git rm packages/shared/src/components/ui/perimeter/*.tsx

# Move the three back
mv /tmp/icon-select.tsx packages/shared/src/components/ui/perimeter/icon-select.tsx
mv /tmp/sort-select.tsx packages/shared/src/components/ui/perimeter/sort-select.tsx
mv /tmp/portal-wrappers.tsx packages/shared/src/components/ui/perimeter/portal-wrappers.tsx
git add packages/shared/src/components/ui/perimeter/
```

- [ ] Verify 3 files remain: `ls packages/shared/src/components/ui/perimeter/*.tsx | wc -l` → 3
- [ ] Commit: `chore(shared): remove synced registry copies (keep icon-select, sort-select, portal-wrappers)`

### Task 3: Delete sync scripts

```bash
git rm packages/shared/scripts/sync-components.mjs
git rm packages/shared/scripts/sync-tokens.mjs
git rm packages/shared/scripts/post-sync.mjs
```

- [ ] Commit: `chore(shared): remove sync-components/sync-tokens/post-sync scripts (registry is now a workspace package)`

---

## Chunk 2: Wire shared to the workspace registry

### Task 4: Add registry workspace dep + remove sync scripts in `packages/shared/package.json`

- [ ] Add `"@perimeter-widgets/registry": "workspace:*"` to `dependencies`
- [ ] Remove the `sync:style` and `sync:tokens` entries from `scripts`
- [ ] Commit: `feat(shared): depend on @perimeter-widgets/registry workspace package`

### Task 5: Remove `sync:style` and `sync:tokens` from root `package.json`

- [ ] Commit: `chore(root): remove sync:style and sync:tokens scripts (registry is local)`

### Task 6: Rewrite `packages/shared/src/components/index.ts`

Replace the existing `export *` block pointing at `./ui/perimeter/*` with a single `export *` from the workspace package (but only for the components the shared barrel was exposing). Keep: `cn` from `../lib/utils`, `icon-select`, `sort-select`, and the portal-wrapper overrides.

Target content:

```typescript
// Registry components — re-exported from the workspace package
export * from '@perimeter-widgets/registry';

// Widget-specific compositions and wrappers
export * from './ui/perimeter/icon-select';
export * from './ui/perimeter/sort-select';

// Portal-aware wrappers — override the base exports with versions that
// auto-inject the shadow DOM portal container from widget context.
export {
    DialogContent,
    ComboboxContent,
    SelectContent,
    DropdownMenuContent,
    TooltipContent,
    MultiCombobox,
} from './ui/perimeter/portal-wrappers';
```

Notes:

- The portal-wrappers `export { ... }` at the bottom intentionally shadows the corresponding names from the `@perimeter-widgets/registry` star-export — ES module re-exports resolve to the last named export for a given name, so the portal versions win for consumers.
- Renamed aliases from before (`BaseInput`, `BaseTextarea`, `BaseButton`, `BaseDialog`) are dropped: the wrapper files they pointed at are gone, and widgets can pull the base components directly from the registry if needed.

- [ ] Commit: `feat(shared): re-export registry components from workspace; drop Base* aliases`

### Task 7: Update `packages/shared/src/components/ui/perimeter/portal-wrappers.tsx`

Replace the six sibling imports (`./dialog`, `./combobox`, `./select`, `./dropdown-menu`, `./tooltip`, `./multi-combobox`) with imports from `@perimeter-widgets/registry`. Each base component is a named export on the workspace package, so rewrite like:

```typescript
import {
    DialogContent as BaseDialogContent,
    ComboboxContent as BaseComboboxContent,
    SelectContent as BaseSelectContent,
    DropdownMenuContent as BaseDropdownMenuContent,
    TooltipContent as BaseTooltipContent,
    MultiCombobox as BaseMultiCombobox,
    type MultiComboboxProps,
} from '@perimeter-widgets/registry';
```

Keep the two `usePortalContainer` / `useShadowEnvironment` imports from `../../../shadow-dom/*` — they're widget-local.

- [ ] Commit: `refactor(shared): import portal-wrapper base components from workspace registry`

---

## Chunk 3: Verify + PR

### Task 8: Install + workspace quality

```bash
pnpm -w install
pnpm -w quality
```

- [ ] Verify all 14 turbo tasks pass + prettier clean.
- [ ] `pnpm --filter @perimeter-widgets/widget-sermons build` produces a working `dist/sermons/sermons.js`.
- [ ] If any consumer of `BaseInput`/`BaseTextarea`/`BaseButton`/`BaseDialog` appears (`rg "BaseInput|BaseTextarea|BaseButton|BaseDialog" packages/`), update it to pull the non-aliased names directly from `@perimeter-widgets/shared` or `@perimeter-widgets/registry`.

### Task 9: Push + open PR

```bash
git push -u origin feat/shared-imports-from-registry
```

Write PR body to `/tmp/phase-2-pr-body.md` via Write tool, then:

```bash
gh pr create --base dev --title "feat: Phase 2 - shared imports from workspace registry" --body-file /tmp/phase-2-pr-body.md
```

PR body summary:

- Retires `packages/shared/src/components/ui/**` wrapper duplicates + synced copies (34 files deleted); `packages/shared/src/components/index.ts` re-points the public API at `@perimeter-widgets/registry`.
- Drops `sync:style`, `sync:tokens`, and their three backing scripts.
- Keeps `icon-select`, `sort-select`, and `portal-wrappers` as widget-originals.
- Sermons widget builds identically; no visual regression expected.
