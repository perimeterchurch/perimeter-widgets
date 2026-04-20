# Versioning Strategy

## How Registry Updates Work

The shadcn registry serves source code, not compiled packages. There is no `package.json` version to bump. Instead:

- **Registry changes are immediate** — when you redeploy, consumers get the new version on their next `shadcn add`
- **Installed components are frozen** — once a consumer installs a component, they own that copy. It never auto-updates
- **Updates are opt-in** — consumers explicitly run `shadcn add -o` to overwrite with the latest

## Update Workflow for Consumers

### Check What Changed

```bash
pnpm dlx shadcn@latest diff @perimeter/button
```

This shows a diff between your local copy and the registry version.

### Update a Single Component

```bash
pnpm dlx shadcn@latest add @perimeter/button -o
```

The `-o` (overwrite) flag replaces your local copy with the latest from the registry. **Review the diff first** — if you've made local modifications, they'll be lost.

### Update All Components

```bash
pnpm dlx shadcn@latest add @perimeter/button @perimeter/card @perimeter/input -o
```

There's no `--update-all` flag. List the components you want to update explicitly.

## When to Update the Registry

### Non-Breaking Changes (safe to deploy immediately)

- New components added
- Bug fixes in component internals
- Accessibility improvements
- New token additions (existing tokens unchanged)
- New theme presets

### Breaking Changes (communicate before deploying)

- Token renames (e.g., `--primary` → `--brand`)
- Token value changes that significantly alter appearance
- Component API changes (new required props, removed props)
- Component file renames
- Removal of components

### How to Communicate Breaking Changes

1. **Document in a CHANGELOG.md** at the registry root
2. **Tag the commit** with a semver-style label (e.g., `v2.0.0`)
3. **Notify consuming projects** — open issues or mention in stand-up
4. **Provide migration steps** — what changed, what to update

## Token Versioning

Tokens don't have traditional versions, but you can track changes:

- **Token additions** are always safe — new tokens don't affect existing components
- **Token value changes** affect all projects simultaneously (when they update)
- **Token removals** break components that reference them

### Safe Token Updates

```css
/* Adding a new token — safe */
:root {
  --sidebar-accent: oklch(0.55 0.12 200);
}

/* Changing a value — consumers get it on next update */
:root {
  --primary: oklch(0.5 0.15 283); /* was 0.488 0.145 283 */
}
```

### Breaking Token Updates

```css
/* Renaming a token — BREAKING */
/* OLD: --color-brand → consumers still reference this */
/* NEW: --primary → new name */
/* Fix: keep both during transition */
:root {
  --primary: oklch(0.488 0.145 283);
  --color-brand: var(--primary); /* backwards compat */
}
```

## Theme Versioning

Themes are even simpler — they're partial overrides. A theme only includes the tokens it changes. Adding new tokens to the base palette doesn't affect existing themes.

If a theme references a token that no longer exists in the base, it silently has no effect (CSS custom properties don't error on missing references).

## Recommended Workflow

1. **Test changes locally** — use the theme editor to preview
2. **Commit to `dev` branch** — team review
3. **Merge to `main`** — triggers GitHub Pages deployment
4. **Notify consumers** — "new registry version deployed"
5. **Consumers update at their own pace** — `shadcn diff` → `shadcn add -o`
