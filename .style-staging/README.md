# Perimeter Style

shadcn-compatible component registry and showcase site for Perimeter Church. Built with Next.js, deployed on Vercel.

## What's Inside

- **55 components** in `registry/ui/perimeter/` with interactive playgrounds
- **5 page templates** (dashboard, settings, login, data table, marketing landing)
- **Token reference** with light/dark values and color previews
- **Theme system** with warm stone palette in OKLCH, plus project-specific overrides

## Using Components in Your Project

**1. Add the registry** to your `components.json`:

```json
{
  "registries": {
    "perimeter": {
      "url": "https://style.perimeter.org/r"
    }
  }
}
```

**2. Install components** with the shadcn CLI:

```bash
pnpm dlx shadcn@latest add @perimeter/button
```

**3. Import and use** — components land in your `src/components/ui/`:

```tsx
import { Button } from "@/components/ui/button";
```

## Development

```bash
pnpm install
pnpm dev        # starts Next.js dev server on http://localhost:3000
```

Uses `--webpack` because Turbopack hangs with 55 dynamic demo imports.

### Build

```bash
pnpm build      # generates themes + demos + registry + static export
```

### Quality

```bash
pnpm quality    # typecheck + lint + format:check
```

## Deployment

Static export deployed on [Vercel](https://vercel.com). The `/r` path serves the built registry JSON that the shadcn CLI fetches from.

## Theming

Apply a project theme with the `data-theme` attribute:

```html
<html data-theme="metrics"></html>
```

Available themes: `default`, `perimeter-api`, `metrics`. Dark mode via `.dark` class, independent of theme.
