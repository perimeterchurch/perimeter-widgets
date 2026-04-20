# Per-Project Integration Guide

How to integrate the Perimeter design system registry into each consuming project.

## Prerequisites (All Projects)

1. Add the registry to `components.json`:

```json
{
  "registries": {
    "@perimeter": "https://style.perimeter.org/r/{name}.json"
  }
}
```

2. Install the base style:

```bash
pnpm dlx shadcn@latest add @perimeter/perimeter-base
```

This sets up the warm stone palette tokens in your `globals.css`.

---

## perimeter-api (Next.js 16)

### Current State

- Has its own `tokens.css` with a nearly identical warm stone palette
- Uses `next-themes` with class-based dark mode (`.dark`)
- Uses `@headlessui/react`, `framer-motion`, `lucide-react`

### Migration Steps

1. **Initialize shadcn** (if not already):

```bash
pnpm dlx shadcn@latest init --style new-york --base-color stone
```

2. **Add the Perimeter registry** to `components.json` (see Prerequisites above)

3. **Install base + components**:

```bash
pnpm dlx shadcn@latest add @perimeter/perimeter-base
pnpm dlx shadcn@latest add @perimeter/button @perimeter/card @perimeter/input @perimeter/select @perimeter/tabs
# ... add components as needed
```

4. **Install the project theme**:

```bash
pnpm dlx shadcn@latest add @perimeter/perimeter-api-theme
```

5. **Remove local tokens**: Delete `src/styles/tokens.css` — the base style provides all tokens now.

6. **Dark mode**: `next-themes` with `attribute="class"` works out of the box. The `.dark` class is what the design system expects:

```tsx
<ThemeProvider attribute="class" defaultTheme="light">
```

### What Changes

- Components come from `@/components/ui/` (shadcn convention) instead of custom imports
- Tokens are OKLCH format instead of hex
- Dark mode uses the same `.dark` class mechanism

---

## perimeter-widgets (Turborepo + Vite)

### Current State

- Monorepo with shared package
- Uses `data-theme="dark"` for dark mode
- Shadow DOM isolation for widgets
- CSS inlined via `?inline` for widget delivery

### Migration Steps

1. **In the shared package**, initialize shadcn:

```bash
cd packages/shared
pnpm dlx shadcn@latest init --style new-york --base-color stone
```

2. **Add the registry** to `packages/shared/components.json`

3. **Install base + needed components**:

```bash
pnpm dlx shadcn@latest add @perimeter/perimeter-base
pnpm dlx shadcn@latest add @perimeter/button @perimeter/card
# Only install what you actually use — widgets should stay lean
```

4. **Remove local tokens**: Replace `shared/src/styles/tokens.css` with the base style tokens.

5. **Dark mode compatibility**: The design system uses `.dark` class, but widgets use `data-theme="dark"`. Add this to your CSS:

```css
@custom-variant dark (&:is(.dark *, [data-theme="dark"] *));
```

This makes `dark:` utilities respond to both mechanisms.

6. **Shadow DOM**: The `?inline` import pattern continues to work. Import component CSS alongside your widget CSS.

### What Changes

- Shared token definitions come from the registry instead of local copies
- Components are source code owned by your project
- Widget-specific components stay as-is

---

## metrics (Next.js 15)

### Current State

- Imports tokens from `@perimeter-widgets/shared/styles/tokens`
- Uses `next-themes` with `attribute='data-theme'`
- Default theme is dark
- Has custom chart and service colors

### Migration Steps

1. **Initialize shadcn**:

```bash
pnpm dlx shadcn@latest init --style new-york --base-color stone
```

2. **Add the registry** to `components.json`

3. **Install base + theme + components**:

```bash
pnpm dlx shadcn@latest add @perimeter/perimeter-base
pnpm dlx shadcn@latest add @perimeter/metrics-theme
pnpm dlx shadcn@latest add @perimeter/button @perimeter/card @perimeter/table @perimeter/tabs
```

4. **Remove shared dependency**: Replace the `@perimeter-widgets/shared` file dependency with registry components.

5. **Keep app-specific tokens**: Your chart colors and service-specific colors stay in a local `tokens.css`:

```css
/* src/styles/tokens.css — app-specific extensions */
:root {
  --chart-attendance: oklch(0.55 0.15 280);
  --chart-giving: oklch(0.6 0.16 145);
  --service-9am: oklch(0.65 0.12 60);
  --service-11am: oklch(0.55 0.14 200);
}
```

6. **Dark mode**: Switch from `attribute='data-theme'` to `attribute='class'`:

```tsx
<ThemeProvider attribute="class" defaultTheme="dark">
```

### What Changes

- No longer depends on perimeter-widgets for tokens
- Components are self-contained in your project
- Chart/service colors remain local (not in the design system)

---

## Common Patterns

### Overriding Tokens Per-Project

Add overrides in your `globals.css` AFTER the base tokens:

```css
/* Your base tokens come from @perimeter/perimeter-base */

/* Project-specific overrides */
:root {
  --primary: oklch(0.45 0.12 250); /* Different primary for this project */
}
.dark {
  --primary: oklch(0.55 0.12 250);
}
```

### Updating Components

When the registry is updated:

```bash
pnpm dlx shadcn@latest diff @perimeter/button    # See what changed
pnpm dlx shadcn@latest add @perimeter/button -o   # Overwrite with latest
```

The `-o` flag overwrites existing files. Review changes before accepting.

### Adding Project-Specific Components

Components installed from the registry are source code you own. Modify them freely:

```bash
# Install the base component
pnpm dlx shadcn@latest add @perimeter/button

# Then edit components/ui/button.tsx as needed
# Your changes won't be overwritten unless you use -o
```
