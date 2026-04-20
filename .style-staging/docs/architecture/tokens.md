# Token Architecture

## Overview

Design tokens define the visual identity — colors, radius, spacing. They're CSS custom properties in OKLCH format, following shadcn's naming convention with Perimeter's warm stone palette.

## Color Format: OKLCH

All color tokens use OKLCH (Oklch Lightness Chroma Hue):

```css
--primary: oklch(0.488 0.145 283);
/*               L     C     H
                 |     |     |
                 |     |     └─ Hue (degrees, 0-360)
                 |     └─ Chroma (saturation, 0-0.4)
                 └─ Lightness (0=black, 1=white)
*/
```

OKLCH is perceptually uniform — equal chroma values look equally saturated across different hues. This makes palette design more predictable than HSL or hex.

## Token Naming Convention

shadcn's standard: background/foreground pairs.

| Token                                    | Purpose                         |
| ---------------------------------------- | ------------------------------- |
| `--primary` / `--primary-foreground`     | Brand color + text on brand     |
| `--secondary` / `--secondary-foreground` | Subtle backgrounds + text       |
| `--muted` / `--muted-foreground`         | Dimmed surfaces + muted text    |
| `--accent` / `--accent-foreground`       | Highlight surfaces + text       |
| `--destructive`                          | Error/danger color              |
| `--background` / `--foreground`          | Page background + default text  |
| `--card` / `--card-foreground`           | Card surface + text             |
| `--popover` / `--popover-foreground`     | Popover surface + text          |
| `--border`                               | Default border color            |
| `--input`                                | Input border color              |
| `--ring`                                 | Focus ring color                |
| `--chart-1` through `--chart-5`          | Chart/data visualization colors |

### Perimeter Extensions

These are NOT part of shadcn's default set:

| Token                                | Purpose               |
| ------------------------------------ | --------------------- |
| `--success` / `--success-foreground` | Success state (green) |
| `--warning` / `--warning-foreground` | Warning state (amber) |
| `--info` / `--info-foreground`       | Info state (blue)     |

## Where Tokens Are Defined

Tokens exist in two places (must stay in sync):

| Location                    | Purpose                                          |
| --------------------------- | ------------------------------------------------ |
| `src/app/globals.css`       | CSS source of truth — `:root` and `.dark` blocks |
| `src/lib/default-tokens.ts` | TypeScript copy for the editor store             |

The `globals.css` file also contains the `@theme inline` block that bridges CSS variables to Tailwind utility classes (e.g., `--color-primary: var(--primary)` enables `bg-primary`).

## Warm Stone Palette

The palette uses warm hues (stone grays with yellow-orange undertones) and indigo as the primary accent.

| Color       | Light                    | Dark                    | Hue                    |
| ----------- | ------------------------ | ----------------------- | ---------------------- |
| Primary     | `oklch(0.488 0.145 283)` | `oklch(0.55 0.145 283)` | Indigo                 |
| Success     | `oklch(0.59 0.16 145)`   | `oklch(0.65 0.16 145)`  | Green                  |
| Warning     | `oklch(0.78 0.15 80)`    | `oklch(0.82 0.15 80)`   | Amber                  |
| Destructive | `oklch(0.577 0.245 27)`  | `oklch(0.65 0.235 27)`  | Rose                   |
| Info        | `oklch(0.62 0.17 230)`   | `oklch(0.68 0.17 230)`  | Sky                    |
| Background  | `oklch(0.985 0.002 75)`  | `oklch(0.147 0.012 50)` | Warm white / stone-900 |

## Dark Mode

Dark mode is activated via the `.dark` CSS class on an ancestor element. The `@custom-variant dark` directive in `globals.css` tells Tailwind to scope `dark:` utilities to `.dark` descendants.

In the theme editor, `PreviewPanel` applies `className="dark"` to the preview wrapper when dark mode is active.

## Project-Specific Themes

Themes are partial token overrides stored in `registry/themes/*.json`:

```json
{
  "name": "perimeter-api-theme",
  "type": "registry:theme",
  "cssVars": {
    "light": { "primary": "oklch(0.45 0.12 250)" },
    "dark": { "primary": "oklch(0.55 0.12 250)" }
  }
}
```

When loaded in the editor, partial overrides are merged with the default tokens. Tokens not specified in the theme inherit from the base palette.

## Tailwind Bridge

The `@theme inline` block in `globals.css` maps CSS variables to Tailwind's namespace:

```css
@theme inline {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  /* ... */
}
```

This enables Tailwind classes like `bg-primary`, `text-muted-foreground`, `rounded-lg` to consume the CSS variables.
