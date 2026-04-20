# Consuming the Registry

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A React project with Tailwind CSS v4

## Step 1: Configure Registry

Add the Perimeter registry to your project's `components.json`:

```json
{
  "registries": {
    "@perimeter": "https://style.perimeter.org/r/{name}.json"
  }
}
```

## Step 2: Install Components

```bash
pnpm dlx shadcn@latest add @perimeter/button
pnpm dlx shadcn@latest add @perimeter/card
pnpm dlx shadcn@latest add @perimeter/input
```

The CLI writes `.tsx` source files into your project. You own the code.

## Step 3: Install a Theme (Optional)

```bash
pnpm dlx shadcn@latest add @perimeter/perimeter-api-theme
```

This writes CSS variable overrides into your `globals.css`.

## Step 4: Apply Tokens

Ensure your root CSS imports the token variables. If you're starting fresh, the base shadcn setup handles this. If adding to an existing project, make sure your `globals.css` has the `:root` and `.dark` blocks with OKLCH token values.

## Dark Mode

Set `className="dark"` on an ancestor element:

```tsx
<html className={isDark ? "dark" : ""}>
```

Or use `next-themes` with `attribute="class"`:

```tsx
<ThemeProvider attribute="class" defaultTheme="light">
```

## Project-Specific Themes

For custom branding, apply theme overrides in your CSS:

```css
/* Override just the tokens you need */
:root {
  --primary: oklch(0.45 0.12 250);
  --primary-foreground: oklch(0.985 0 0);
}
```

Or install a pre-built theme from the registry.
