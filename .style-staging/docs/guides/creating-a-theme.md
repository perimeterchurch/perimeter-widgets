# Creating a Theme

Project-specific themes override the default token palette. A theme only needs to define tokens that differ from the default.

## Create a Theme File

Add a JSON file to `registry/themes/`. The filename becomes the theme slug (e.g., `my-project.json` → `data-theme="my-project"`).

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "my-project",
  "type": "registry:theme",
  "cssVars": {
    "light": {
      "primary": "oklch(0.50 0.16 200)",
      "primary-foreground": "oklch(0.985 0 0)",
      "ring": "oklch(0.50 0.16 200)",
      "chart-1": "oklch(0.50 0.16 200)"
    },
    "dark": {
      "primary": "oklch(0.60 0.16 200)",
      "primary-foreground": "oklch(0.147 0 0)",
      "ring": "oklch(0.60 0.16 200)",
      "chart-1": "oklch(0.60 0.16 200)"
    }
  }
}
```

## Token Format

All color values use OKLCH format: `oklch(lightness chroma hue)`. See `registry/themes/default.json` for the full token list and default values.

Common tokens to override: `primary`, `primary-foreground`, `ring`, `chart-1`. Override additional tokens only when the project branding requires it.

## Build the Theme

Run `pnpm generate:themes` to inject the new theme's CSS into `src/app/globals.css`. The theme appears automatically in the site's theme switcher.

## Apply in a Consumer Project

Set `data-theme` on the root element:

```html
<html data-theme="my-project"></html>
```

Combine with `.dark` for dark mode:

```html
<html data-theme="my-project" class="dark"></html>
```
