# @perimeter-widgets/registry

shadcn-compatible component registry for Perimeter Church projects. 56 components, 2 hooks, and 3 themes published at [`style.perimeter.org`](https://style.perimeter.org/r/registry.json).

Browse interactively: [`https://style.perimeter.org/components`](https://style.perimeter.org/components).

## Consuming from another project

The registry is published as static JSON manifests, so any shadcn-cli-compatible project can pull components in.

```sh
pnpm dlx shadcn@latest add https://style.perimeter.org/r/<component>.json
```

Examples:

```sh
pnpm dlx shadcn@latest add https://style.perimeter.org/r/button.json
pnpm dlx shadcn@latest add https://style.perimeter.org/r/select.json
pnpm dlx shadcn@latest add https://style.perimeter.org/r/sidebar.json
```

Components are written against `@base-ui/react` (not Radix) and use class-variance-authority for variants. Styling assumes Tailwind v4. `lucide-react` is the icon library — install it once in your project:

```sh
pnpm add lucide-react
```

The CLI rewrites `@/lib/utils`, `@/components/ui/*`, and `@/hooks/*` to your project's aliases (set in your `components.json`).

## Themes

| Theme         | Slug            | Where it ships                            |
| ------------- | --------------- | ----------------------------------------- |
| Default       | `default`       | The base palette every project starts on. |
| Metrics       | `metrics`       | `metrics.perimeter.org` — green primary.  |
| Perimeter API | `perimeter-api` | `api.perimeter.org` — blue primary.       |

Non-default themes are **partial overrides** — they redefine `primary`, `primary-foreground`, `ring`, and `chart-1` only; everything else inherits from default.

To opt into a non-default theme, add `data-theme="<slug>"` on `<html>` (or any ancestor) and the CSS variables cascade down. Light/dark works the same as default — toggle the `.dark` class on the same element.

```html
<html data-theme="metrics" class="dark"></html>
```

Pull a theme via the CLI like a component:

```sh
pnpm dlx shadcn@latest add https://style.perimeter.org/r/themes/metrics.json
```

## Contributing

This package lives in the `perimeter-widgets` monorepo. Read the parent [`CLAUDE.md`](../../CLAUDE.md) for git workflow and conventions.

```sh
# from monorepo root
pnpm --filter @perimeter-widgets/registry build       # regenerate manifests + theme CSS
pnpm --filter @perimeter-widgets/registry typecheck
pnpm --filter @perimeter-widgets/registry lint
pnpm --filter @perimeter-widgets/site dev             # run the showcase locally
```

### Adding a component

1. Add the source file at `ui/perimeter/<name>.tsx`. Imports use `@/lib/utils`, `@/components/ui/*`, and `@/hooks/*` — those aliases resolve into this package via `tsconfig.json` and get rewritten by the shadcn CLI for downstream consumers.
2. Add a demo at `ui/perimeter/<name>.demo.tsx` (consumed by the showcase site's playground). Import demo types via the relative path `'../../lib/demo-types'`.
3. Re-export from `src/index.ts` if it should be importable as `@perimeter-widgets/registry` for in-monorepo callers.
4. Run `pnpm --filter @perimeter-widgets/registry build` — `scripts/generate-registry.ts` walks `ui/perimeter/`, infers dependencies from imports, and emits `public/r/<name>.json`.

### Editing themes

Themes live in `themes/*.json`. The default theme defines every CSS variable; non-default themes are partial overrides.

`scripts/generate-theme-css.ts` validates on every build:

- The default theme's `light` and `dark` blocks declare matching keys.
- Each non-default theme's `light` and `dark` blocks declare matching keys.
- Every key in a non-default theme exists in the default theme (no typos, no orphans).

Build also injects the theme CSS into `apps/site/src/app/globals.css` and `packages/shared/src/styles/base.css` between `@generated-themes-*` / `@sync:tokens-*` markers.
