# Component Showcase Site Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the style project from a theme editor to a component showcase site with interactive playgrounds, template gallery, and token reference.

**Architecture:** Registry-native approach — demo files co-located with registry components drive all page generation. Build-time scripts produce a manifest and theme CSS. Next.js static export with client-side playground interactivity. No Zustand — lightweight React context for theme switching.

**Tech Stack:** Next.js 16 (static export), Tailwind CSS v4, shadcn/ui registry, cmdk (search), Shiki (syntax highlighting), OKLCH color tokens.

**Spec:** `docs/superpowers/specs/2026-03-26-component-showcase-design.md`

---

## Chunk 1: Foundation — Registry Restructure, Cleanup, Theme System

This chunk moves the registry to its new path, deletes old editor code, creates the default theme JSON, and sets up the theme CSS generation pipeline. After this chunk, `pnpm build` works with the new structure.

### Task 1: Move registry components to new path

**Files:**

- Move: `registry/new-york/ui/*.tsx` → `registry/ui/perimeter/*.tsx`
- Move: `registry/new-york/lib/utils.ts` → `registry/ui/perimeter/lib/utils.ts`
- Delete: `registry/new-york/` (entire directory after move)

- [ ] **Step 1: Create new directory and move component files**

```bash
mkdir -p registry/ui/perimeter/lib
cp registry/new-york/ui/*.tsx registry/ui/perimeter/
cp registry/new-york/lib/utils.ts registry/ui/perimeter/lib/
```

- [ ] **Step 2: Verify all 55 components moved**

Run: `ls registry/ui/perimeter/*.tsx | wc -l`
Expected: 55

- [ ] **Step 3: Remove old directory**

```bash
rm -rf registry/new-york/
```

- [ ] **Step 4: Commit**

```bash
git add registry/
git commit -m "refactor: move registry components to registry/ui/perimeter/"
```

### Task 2: Update generate-registry.ts for new paths

**Files:**

- Modify: `scripts/generate-registry.ts`

- [ ] **Step 1: Update the UI_DIR constant**

Change `registry/new-york/ui` → `registry/ui/perimeter` in the directory scanning logic.

- [ ] **Step 2: Update the lib path reference**

Change `registry/new-york/lib` → `registry/ui/perimeter/lib` for the utils entry.

- [ ] **Step 3: Update any import path extraction logic**

The `extractRegistryDeps` function scans for imports from `@/registry/new-york/ui/`. Update this pattern to `@/registry/ui/perimeter/`.

- [ ] **Step 4: Run registry build to verify**

Run: `pnpm registry:build`
Expected: Builds successfully, `registry.json` generated with all 55 components + themes + base.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-registry.ts registry.json
git commit -m "refactor: update generate-registry.ts for new registry path"
```

### Task 3: Add @registry path alias to tsconfig.json

**Files:**

- Modify: `tsconfig.json`

- [ ] **Step 1: Add the path alias**

Add `"@registry/*": ["./registry/*"]` to the `paths` object in `compilerOptions`, alongside the existing `"@/*": ["./src/*"]`.

- [ ] **Step 2: Verify TypeScript resolves the new alias**

Run: `pnpm typecheck`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add @registry path alias to tsconfig"
```

### Task 4: Delete old editor code and remove zustand

**Files:**

- Delete: `src/app/editor/page.tsx`
- Delete: `src/components/editor/` (3 files: preview-panel.tsx, theme-selector.tsx, token-controls.tsx)
- Delete: `src/components/preview/` (3 files: dashboard.tsx, forms.tsx, showcase.tsx)
- Delete: `src/lib/editor-store.ts`
- Delete: `src/lib/theme-manager-store.ts`
- Delete: `src/lib/export-theme.ts`
- Delete: `src/lib/default-tokens.ts`
- Delete: `storybook-static/` (if it exists and is tracked)
- Modify: `package.json` (remove zustand)

- [ ] **Step 1: Delete editor route, components, and stores**

```bash
rm -rf src/app/editor/
rm -rf src/components/editor/
rm -rf src/components/preview/
rm src/lib/editor-store.ts src/lib/theme-manager-store.ts src/lib/export-theme.ts src/lib/default-tokens.ts
rm -rf storybook-static/
```

- [ ] **Step 2: Remove zustand from dependencies**

```bash
pnpm remove zustand
```

- [ ] **Step 3: Update the landing page to remove editor link**

The current `src/app/page.tsx` has a link to `/editor`. Replace the entire page with a minimal placeholder that confirms the site loads:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-3xl font-bold">Perimeter Style</h1>
      <p className="text-muted-foreground mt-2">
        Component showcase — coming soon
      </p>
    </main>
  );
}
```

- [ ] **Step 4: Update layout.tsx to remove editor-specific imports**

Check `src/app/layout.tsx` for any imports from deleted files. Keep the Toaster and font setup. Remove any editor-related imports.

- [ ] **Step 5: Verify the app builds**

Run: `pnpm build`
Expected: Builds successfully with no import errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/editor/ src/components/editor/ src/components/preview/ src/lib/editor-store.ts src/lib/theme-manager-store.ts src/lib/export-theme.ts src/lib/default-tokens.ts storybook-static/ package.json pnpm-lock.yaml src/app/page.tsx src/app/layout.tsx
git commit -m "refactor: remove editor code, preview components, and zustand dependency"
```

### Task 5: Create default.json theme file

**Files:**

- Create: `registry/themes/default.json`
- Modify: `src/app/globals.css` (remove inline token values)

- [ ] **Step 1: Create default.json from existing globals.css values**

Create `registry/themes/default.json` with the full token set currently in `globals.css`. Use the same structure as existing theme files:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "default-theme",
  "type": "registry:theme",
  "cssVars": {
    "light": {
      "radius": "0.625rem",
      "background": "oklch(0.985 0.002 75)",
      "foreground": "oklch(0.147 0.012 50)",
      "card": "oklch(0.985 0.002 75)",
      "card-foreground": "oklch(0.147 0.012 50)",
      "popover": "oklch(0.985 0.002 75)",
      "popover-foreground": "oklch(0.147 0.012 50)",
      "primary": "oklch(0.488 0.145 283)",
      "primary-foreground": "oklch(0.985 0 0)",
      "secondary": "oklch(0.97 0.003 75)",
      "secondary-foreground": "oklch(0.41 0.01 50)",
      "muted": "oklch(0.96 0.003 75)",
      "muted-foreground": "oklch(0.553 0.01 50)",
      "accent": "oklch(0.96 0.003 75)",
      "accent-foreground": "oklch(0.41 0.01 50)",
      "destructive": "oklch(0.577 0.245 27)",
      "destructive-foreground": "oklch(0.985 0 0)",
      "border": "oklch(0.87 0.006 75)",
      "input": "oklch(0.87 0.006 75)",
      "ring": "oklch(0.488 0.145 283)",
      "chart-1": "oklch(0.488 0.145 283)",
      "chart-2": "oklch(0.59 0.16 145)",
      "chart-3": "oklch(0.78 0.15 80)",
      "chart-4": "oklch(0.577 0.245 27)",
      "chart-5": "oklch(0.62 0.17 230)",
      "success": "oklch(0.59 0.16 145)",
      "success-foreground": "oklch(0.985 0 0)",
      "warning": "oklch(0.78 0.15 80)",
      "warning-foreground": "oklch(0.985 0 0)",
      "info": "oklch(0.62 0.17 230)",
      "info-foreground": "oklch(0.985 0 0)",
      "sidebar": "oklch(0.97 0.003 75)",
      "sidebar-foreground": "oklch(0.147 0.012 50)",
      "sidebar-primary": "oklch(0.488 0.145 283)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-accent": "oklch(0.96 0.003 75)",
      "sidebar-accent-foreground": "oklch(0.41 0.01 50)",
      "sidebar-border": "oklch(0.87 0.006 75)",
      "sidebar-ring": "oklch(0.488 0.145 283)"
    },
    "dark": {
      "radius": "0.625rem",
      "background": "oklch(0.147 0.012 50)",
      "foreground": "oklch(0.985 0.002 75)",
      "card": "oklch(0.21 0.012 50)",
      "card-foreground": "oklch(0.985 0.002 75)",
      "popover": "oklch(0.21 0.012 50)",
      "popover-foreground": "oklch(0.985 0.002 75)",
      "primary": "oklch(0.55 0.145 283)",
      "primary-foreground": "oklch(0.985 0 0)",
      "secondary": "oklch(0.27 0.01 50)",
      "secondary-foreground": "oklch(0.87 0.006 75)",
      "muted": "oklch(0.27 0.01 50)",
      "muted-foreground": "oklch(0.7 0.006 75)",
      "accent": "oklch(0.27 0.01 50)",
      "accent-foreground": "oklch(0.87 0.006 75)",
      "destructive": "oklch(0.65 0.235 27)",
      "destructive-foreground": "oklch(0.985 0 0)",
      "border": "oklch(0.35 0.01 50)",
      "input": "oklch(0.35 0.01 50)",
      "ring": "oklch(0.55 0.145 283)",
      "chart-1": "oklch(0.55 0.145 283)",
      "chart-2": "oklch(0.64 0.16 145)",
      "chart-3": "oklch(0.82 0.15 80)",
      "chart-4": "oklch(0.65 0.235 27)",
      "chart-5": "oklch(0.67 0.17 230)",
      "success": "oklch(0.64 0.16 145)",
      "success-foreground": "oklch(0.985 0 0)",
      "warning": "oklch(0.82 0.15 80)",
      "warning-foreground": "oklch(0.985 0 0)",
      "info": "oklch(0.67 0.17 230)",
      "info-foreground": "oklch(0.985 0 0)",
      "sidebar": "oklch(0.21 0.012 50)",
      "sidebar-foreground": "oklch(0.985 0.002 75)",
      "sidebar-primary": "oklch(0.55 0.145 283)",
      "sidebar-primary-foreground": "oklch(0.985 0 0)",
      "sidebar-accent": "oklch(0.27 0.01 50)",
      "sidebar-accent-foreground": "oklch(0.87 0.006 75)",
      "sidebar-border": "oklch(0.35 0.01 50)",
      "sidebar-ring": "oklch(0.55 0.145 283)"
    }
  }
}
```

- [ ] **Step 2: Verify the values match globals.css exactly**

Compare the token values in `default.json` against the `:root` and `.dark` blocks in `globals.css`. They must match exactly.

- [ ] **Step 3: Commit**

```bash
git add registry/themes/default.json
git commit -m "feat: add default.json theme with full warm stone palette"
```

### Task 6: Create generate-theme-css.ts script

**Files:**

- Create: `scripts/generate-theme-css.ts`

- [ ] **Step 1: Write the theme CSS generation script**

```typescript
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

interface ThemeFile {
  name: string;
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

function cssBlock(selector: string, vars: Record<string, string>): string {
  const entries = Object.entries(vars)
    .map(([key, value]) => `  --${key}: ${value};`)
    .join("\n");
  return `${selector} {\n${entries}\n}`;
}

async function generateThemeCSS() {
  const themesDir = join(process.cwd(), "registry", "themes");
  const outputDir = join(process.cwd(), "src", "styles");
  const outputPath = join(outputDir, "themes.css");

  const files = await readdir(themesDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort();

  const blocks: string[] = [
    "/* Auto-generated from registry/themes/ — do not edit manually */",
    "",
  ];

  // Find default.json first — it becomes :root and .dark
  const defaultFile = jsonFiles.find((f) => f === "default.json");
  if (!defaultFile) {
    throw new Error("registry/themes/default.json is required");
  }

  const defaultTheme: ThemeFile = JSON.parse(
    await readFile(join(themesDir, defaultFile), "utf-8"),
  );
  blocks.push(cssBlock(":root", defaultTheme.cssVars.light));
  blocks.push("");
  blocks.push(cssBlock(".dark", defaultTheme.cssVars.dark));

  // Process remaining themes as data-theme overrides
  for (const file of jsonFiles) {
    if (file === "default.json") continue;

    const theme: ThemeFile = JSON.parse(
      await readFile(join(themesDir, file), "utf-8"),
    );
    const slug = file.replace(".json", "").replace("-theme", "");

    blocks.push("");
    blocks.push(cssBlock(`[data-theme="${slug}"]`, theme.cssVars.light));
    blocks.push("");
    blocks.push(cssBlock(`[data-theme="${slug}"].dark`, theme.cssVars.dark));
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, blocks.join("\n") + "\n");
  console.log(`Generated ${outputPath} from ${jsonFiles.length} theme(s)`);
}

generateThemeCSS().catch((err) => {
  console.error("Failed to generate theme CSS:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Run the script to verify output**

Run: `pnpm tsx scripts/generate-theme-css.ts`
Expected: Creates `src/styles/themes.css` with `:root`, `.dark`, and `[data-theme="..."]` blocks.

- [ ] **Step 3: Verify the generated CSS content**

Read `src/styles/themes.css` and confirm:

- `:root` block has all light tokens from `default.json`
- `.dark` block has all dark tokens from `default.json`
- `[data-theme="perimeter-api"]` block has the 4 override tokens
- `[data-theme="metrics"]` block has the 4 override tokens

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-theme-css.ts src/styles/themes.css
git commit -m "feat: add theme CSS generation script"
```

### Task 7: Update globals.css and build pipeline

**Files:**

- Modify: `src/app/globals.css` (remove inline tokens, add import)
- Modify: `package.json` (update build scripts)
- Modify: `.gitignore` (add generated themes.css)

- [ ] **Step 1: Strip token values from globals.css**

Remove the `:root { ... }` and `.dark { ... }` blocks that define color/radius token values. Keep:

- The `@import` statements for tailwindcss, tw-animate-css, shadcn
- Add `@import "../styles/themes.css";` after the other imports
- The `@custom-variant dark` line
- The `@theme inline` block (maps Tailwind tokens to CSS vars — this stays)
- The `@layer base` block

- [ ] **Step 2: Add themes.css to .gitignore**

Add `src/styles/themes.css` to `.gitignore` since it is generated.

- [ ] **Step 3: Update package.json build scripts**

Update the `build` script to run theme generation before Next.js build:

```json
"build": "pnpm registry:build && pnpm generate:themes && next build",
"generate:themes": "tsx scripts/generate-theme-css.ts",
"dev": "pnpm generate:themes && next dev --turbopack"
```

- [ ] **Step 4: Run full build to verify**

Run: `pnpm build`
Expected: Theme CSS generates, registry builds, Next.js build completes successfully.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css package.json .gitignore
git commit -m "refactor: move token values to generated themes.css, update build pipeline"
```

### Task 8: Update generate-registry.ts to sync base.json from default.json

**Files:**

- Modify: `scripts/generate-registry.ts`

- [ ] **Step 1: Add logic to read default.json and write cssVars into base.json**

Before the registry is written, read `registry/themes/default.json`, extract its `cssVars`, and merge them into the base registry item's `cssVars`. This keeps `base.json` in sync with the default theme automatically.

- [ ] **Step 2: Run registry build to verify**

Run: `pnpm registry:build`
Expected: `registry.json` includes base item with cssVars matching `default.json`.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-registry.ts registry.json
git commit -m "feat: sync base.json cssVars from default.json at build time"
```

---

## Chunk 2: Site Shell — Layout, Navigation, Theme Switching, Search

This chunk builds the site chrome: the top nav, sidebar, theme/mode switcher, and Cmd+K search palette. After this chunk, you can navigate between placeholder pages with working theme switching and search.

### Task 9: Install shiki dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install shiki as a dev dependency**

```bash
pnpm add -D shiki
```

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add shiki for build-time syntax highlighting"
```

### Task 10: Create demo type infrastructure

**Files:**

- Create: `src/lib/demo-types.ts`

- [ ] **Step 1: Write the ControlsConfig and PlaygroundProps types**

```typescript
export interface EnumControl {
  type: "enum";
  options: readonly string[];
  default: string;
}

export interface BooleanControl {
  type: "boolean";
  default: boolean;
}

export interface StringControl {
  type: "string";
  default: string;
}

export interface NumberControl {
  type: "number";
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export type ControlDescriptor =
  | EnumControl
  | BooleanControl
  | StringControl
  | NumberControl;

export type ControlsConfig = Record<string, ControlDescriptor>;

type InferControlType<T extends ControlDescriptor> = T extends EnumControl
  ? T["options"][number]
  : T extends BooleanControl
    ? boolean
    : T extends StringControl
      ? string
      : T extends NumberControl
        ? number
        : never;

export type PlaygroundProps<T extends ControlsConfig> = {
  [K in keyof T]: InferControlType<T[K]>;
};

export interface DemoMeta {
  name: string;
  description: string;
  category: string;
  install: string;
}

export interface DemoExample {
  name: string;
  render: () => React.ReactNode;
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/demo-types.ts
git commit -m "feat: add ControlsConfig and PlaygroundProps type infrastructure"
```

### Task 11: Create Shiki highlight utility

**Files:**

- Create: `src/lib/highlight.ts`

- [ ] **Step 1: Write the highlight wrapper**

```typescript
import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: ["tsx", "bash", "json", "css"],
    });
  }
  return highlighter;
}

export async function highlight(
  code: string,
  lang: string = "tsx",
): Promise<string> {
  const h = await getHighlighter();
  return h.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
  });
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/highlight.ts
git commit -m "feat: add Shiki syntax highlighting utility"
```

### Task 12: Create theme context provider

**Files:**

- Create: `src/lib/theme-context.tsx`

- [ ] **Step 1: Write the theme provider**

```typescript
"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

interface ThemeContextValue {
  theme: string
  mode: "light" | "dark"
  setTheme: (theme: string) => void
  setMode: (mode: "light" | "dark") => void
  toggleMode: () => void
  availableThemes: string[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children: React.ReactNode
  availableThemes: string[]
  defaultTheme?: string
  defaultMode?: "light" | "dark"
}

export function ThemeProvider({
  children,
  availableThemes,
  defaultTheme = "",
  defaultMode = "light",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(defaultTheme)
  const [mode, setModeState] = useState<"light" | "dark">(defaultMode)

  const setTheme = useCallback((t: string) => {
    setThemeState(t)
    if (t) {
      document.documentElement.setAttribute("data-theme", t)
    } else {
      document.documentElement.removeAttribute("data-theme")
    }
  }, [])

  const setMode = useCallback((m: "light" | "dark") => {
    setModeState(m)
    document.documentElement.classList.toggle("dark", m === "dark")
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light")
  }, [mode, setMode])

  const initialModeRef = useRef(false)
  useEffect(() => {
    if (!initialModeRef.current) {
      initialModeRef.current = true
      document.documentElement.classList.toggle("dark", defaultMode === "dark")
    }
  }, [defaultMode])

  return (
    <ThemeContext value={{ theme, mode, setTheme, setMode, toggleMode, availableThemes }}>
      {children}
    </ThemeContext>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme-context.tsx
git commit -m "feat: add lightweight theme context provider"
```

### Task 13: Create collect-demos.ts manifest script

**Files:**

- Create: `scripts/collect-demos.ts`
- Modify: `package.json` (add script)
- Modify: `.gitignore` (add generated manifest)

- [ ] **Step 1: Write the manifest collection script**

This script scans `registry/ui/perimeter/*.demo.tsx` files, extracts `meta` exports using regex (not runtime import — avoids TSX compilation), and writes a JSON manifest.

```typescript
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

interface ManifestEntry {
  slug: string;
  name: string;
  description: string;
  category: string;
  install: string;
  demoFile: string;
}

async function collectDemos() {
  const registryDir = join(process.cwd(), "registry", "ui", "perimeter");
  const outputDir = join(process.cwd(), "src", "lib");
  const outputPath = join(outputDir, "demo-manifest.json");

  const files = await readdir(registryDir);
  const demoFiles = files.filter((f) => f.endsWith(".demo.tsx")).sort();

  const manifest: ManifestEntry[] = [];

  for (const file of demoFiles) {
    const content = await readFile(join(registryDir, file), "utf-8");
    const slug = file.replace(".demo.tsx", "");

    // Extract meta fields using regex
    const nameMatch = content.match(/name:\s*"([^"]+)"/);
    const descMatch = content.match(/description:\s*"([^"]+)"/);
    const catMatch = content.match(/category:\s*"([^"]+)"/);
    const installMatch = content.match(/install:\s*"([^"]+)"/);

    if (!nameMatch || !descMatch || !catMatch || !installMatch) {
      console.warn(`Skipping ${file}: missing meta fields`);
      continue;
    }

    manifest.push({
      slug,
      name: nameMatch[1],
      description: descMatch[1],
      category: catMatch[1],
      install: installMatch[1],
      demoFile: `@registry/ui/perimeter/${slug}.demo`,
    });
  }

  // Sort by category then name
  manifest.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
  );

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Collected ${manifest.length} demo(s) → ${outputPath}`);
}

collectDemos().catch((err) => {
  console.error("Failed to collect demos:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Add script to package.json**

```json
"collect:demos": "tsx scripts/collect-demos.ts"
```

Update `build` to include demo collection:

```json
"build": "pnpm registry:build && pnpm generate:themes && pnpm collect:demos && next build"
```

- [ ] **Step 3: Add demo-manifest.json to .gitignore**

Add `src/lib/demo-manifest.json` to `.gitignore`.

- [ ] **Step 4: Commit**

```bash
git add scripts/collect-demos.ts package.json .gitignore
git commit -m "feat: add demo manifest collection script"
```

### Task 14: Create site shell layout with top nav

**Files:**

- Modify: `src/app/layout.tsx` (add ThemeProvider, top nav)
- Create: `src/components/site/top-nav.tsx`
- Create: `src/components/site/theme-switcher.tsx`
- Create: `src/components/site/mode-toggle.tsx`

- [ ] **Step 1: Create the theme switcher component**

`src/components/site/theme-switcher.tsx` — a `"use client"` component:

```tsx
"use client";

import { useTheme } from "@/lib/theme-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue placeholder="Default" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Default</SelectItem>
        {availableThemes.map((t) => (
          <SelectItem key={t} value={t}>
            {t
              .split("-")
              .map((w) => w[0].toUpperCase() + w.slice(1))
              .join(" ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Create the mode toggle component**

`src/components/site/mode-toggle.tsx` — a `"use client"` component:

```tsx
"use client";

import { useTheme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ModeToggle() {
  const { mode, toggleMode } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={toggleMode}
    >
      {mode === "light" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">
        Toggle {mode === "light" ? "dark" : "light"} mode
      </span>
    </Button>
  );
}
```

- [ ] **Step 3: Create the top nav component**

`src/components/site/top-nav.tsx` — server component with client sub-components:

```tsx
import Link from "next/link";
import { ThemeSwitcher } from "./theme-switcher";
import { ModeToggle } from "./mode-toggle";

const NAV_LINKS = [
  { href: "/components", label: "Components" },
  { href: "/templates", label: "Templates" },
  { href: "/tokens", label: "Tokens" },
  { href: "/docs/getting-started", label: "Getting Started" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          Perimeter Style
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {/* SearchTrigger added in Task 16 */}
          <ThemeSwitcher />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Update layout.tsx**

Wrap children in `ThemeProvider` with `availableThemes` derived from the build-time theme list. Import and render `TopNav` above children.

- [ ] **Step 5: Verify the app runs**

Run: `pnpm dev`
Expected: Site loads with top nav, theme switcher works, mode toggle works.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/components/site/
git commit -m "feat: add site shell with top nav, theme switcher, and mode toggle"
```

### Task 15: Create sidebar component

**Files:**

- Create: `src/components/site/docs-sidebar.tsx`
- Create: `src/app/components/layout.tsx` (layout for /components/\* routes)

- [ ] **Step 1: Create the sidebar component**

`src/components/site/docs-sidebar.tsx` — a `"use client"` component that imports `demo-manifest.json`, groups entries by category, and renders a nav with collapsible category sections and active item highlighting via `usePathname()`. See Task 14 for the pattern — uses `cn()` for active state, `Link` for navigation, manifest entries grouped with a simple `Record<string, Entry[]>` reducer.

Key sections: "Getting Started" (hardcoded links to /docs/getting-started), then each category from the manifest as a collapsible heading with component links underneath. Active item gets `bg-accent text-accent-foreground` classes.

- [ ] **Step 2: Create the components layout**

`src/app/components/layout.tsx`:

```tsx
import { DocsSidebar } from "@/components/site/docs-sidebar";

export default function ComponentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <DocsSidebar />
      <main className="flex-1 min-w-0 p-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Verify sidebar renders with placeholder content**

Run: `pnpm dev`, navigate to `/components`
Expected: Sidebar shows with category headings. Content area shows a placeholder.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/docs-sidebar.tsx src/app/components/layout.tsx
git commit -m "feat: add docs sidebar with category navigation"
```

### Task 16: Create Cmd+K search palette

**Files:**

- Create: `src/components/site/search-palette.tsx`
- Modify: `src/app/layout.tsx` (add search palette)

- [ ] **Step 1: Create the search palette component**

`src/components/site/search-palette.tsx` — a `"use client"` component that:

- Renders the Command component (from `@/components/ui/command`) in a dialog
- Listens for Cmd+K / Ctrl+K to open
- Reads the demo manifest for component entries
- Groups results by Components initially. Templates and Tokens groups are added in later chunks (Tasks 35 and 26 respectively) — stub them as empty for now
- Navigates to the selected item's page on selection (using `useRouter()`)

- [ ] **Step 2: Add search palette to layout.tsx**

Import and render `SearchPalette` in the root layout, alongside the Toaster.

- [ ] **Step 3: Verify search works**

Run: `pnpm dev`, press Cmd+K
Expected: Search palette opens, typing filters results, selecting navigates.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/search-palette.tsx src/app/layout.tsx
git commit -m "feat: add Cmd+K search palette with component/template search"
```

---

## Chunk 3: Component Page System — Playground, Controls, Code Display

This chunk builds the dynamic component page infrastructure: the playground with interactive controls, code display with syntax highlighting, and the example rendering system. After this chunk, a single demo file produces a full component page.

### Task 17: Create the playground controls renderer

**Files:**

- Create: `src/components/site/playground-controls.tsx`

- [ ] **Step 1: Write the controls renderer**

`src/components/site/playground-controls.tsx` — a `"use client"` component that:

- Accepts a `ControlsConfig` and current values
- Renders the appropriate input for each control type:
  - `enum` → segmented button group (row of buttons, active one highlighted)
  - `boolean` → toggle switch with label
  - `string` → text input
  - `number` → number input with optional min/max/step
- Calls `onChange(name, value)` when any control changes

```typescript
"use client";

import type { ControlsConfig, ControlDescriptor } from "@/lib/demo-types";

interface PlaygroundControlsProps {
  controls: ControlsConfig;
  values: Record<string, unknown>;
  onChange: (name: string, value: unknown) => void;
}
```

Each control type gets a small inline renderer — no separate files needed since each is just a few lines.

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/playground-controls.tsx
git commit -m "feat: add playground controls renderer for enum/boolean/string/number props"
```

### Task 18: Create the playground wrapper component

**Files:**

- Create: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Write the playground wrapper**

`src/components/site/component-playground.tsx` — a `"use client"` component that:

- Accepts: `Playground` component, `controls` config, `defaultCodeHtml` (pre-rendered HTML string from build time), `componentName` (string)
- Manages control state with `useState` (initialized from control defaults)
- Renders a tabbed interface: Preview | Code
  - Preview tab: renders the Playground component with current control values in a centered display area
  - Code tab: shows the build-time pre-highlighted default code. Code is NOT re-highlighted when controls change (Shiki is async/server-only). Instead, a plain-text version of the current props is shown above the highlighted default as a "Current props" hint. This keeps the Code tab useful without needing client-side Shiki.
- Renders PlaygroundControls below the preview area

```typescript
"use client";

import { useState, useMemo } from "react";
import type { ControlsConfig } from "@/lib/demo-types";
import { PlaygroundControls } from "./playground-controls";

interface ComponentPlaygroundProps {
  playground: React.ComponentType<Record<string, unknown>>;
  controls: ControlsConfig;
  componentName: string;
  defaultCodeHtml: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/site/component-playground.tsx
git commit -m "feat: add component playground with interactive controls and code preview"
```

### Task 19: Create the example renderer component

**Files:**

- Create: `src/components/site/example-card.tsx`

- [ ] **Step 1: Write the example card**

`src/components/site/example-card.tsx` — renders a single example:

- Title (example name)
- Live render area (calls `render()`)
- Expandable code block (Shiki-highlighted HTML, passed as prop)
- Copy button that copies the raw source code to clipboard

```typescript
"use client";

interface ExampleCardProps {
  name: string;
  children: React.ReactNode;
  codeHtml: string;
  rawCode: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/site/example-card.tsx
git commit -m "feat: add example card with live render and copyable code"
```

### Task 20: Create the component page template

**Files:**

- Create: `src/app/components/[category]/[slug]/page.tsx`

- [ ] **Step 1: Write the dynamic component page**

This is the main page for each component. It:

- Uses `generateStaticParams` to enumerate all components from the demo manifest
- Dynamically imports the demo file based on the slug
- Renders:
  1. Breadcrumb (category → component name)
  2. Title + description from `meta`
  3. `ComponentPlayground` with the Playground component, controls, and pre-highlighted default code
  4. Examples section — maps over `examples`, renders each in an `ExampleCard` with pre-highlighted source
  5. Installation section with the install command

```typescript
import manifest from "@/lib/demo-manifest.json";

export function generateStaticParams() {
  return manifest.map((entry) => ({
    category: entry.category,
    slug: entry.slug,
  }));
}

// Dynamic import using a lookup map generated at build time.
// Since Next.js static export requires deterministic imports,
// use a mapping object rather than template literal import().
const DEMO_IMPORTS: Record<string, () => Promise<DemoModule>> = {
  button: () => import("@registry/ui/perimeter/button.demo"),
  card: () => import("@registry/ui/perimeter/card.demo"),
  // ... one entry per component — generated by collect-demos.ts
  // or maintained manually (55 entries)
};

interface DemoModule {
  meta: DemoMeta;
  controls: ControlsConfig;
  Playground: React.ComponentType<Record<string, unknown>>;
  examples: DemoExample[];
}
```

**Important:** The Playground component from the demo file is a client component, but the page itself is a server component. The page passes `Playground` as a prop to the `ComponentPlayground` client wrapper. This works because React can serialize component references across the server/client boundary when they're already `"use client"` modules.

Alternatively, generate the lookup map in `scripts/collect-demos.ts` as a separate file (`src/lib/demo-imports.ts`) to avoid manually maintaining 55 import lines.

The source code extraction for examples uses a build-time helper that reads the raw demo file text and extracts each example's render function body.

- [ ] **Step 2: Create a single demo file to test with**

Create `registry/ui/perimeter/button.demo.tsx` as defined in the spec (the full button demo with meta, controls, Playground, and examples).

- [ ] **Step 3: Run collect:demos to generate manifest**

Run: `pnpm collect:demos`
Expected: `src/lib/demo-manifest.json` contains one entry for button.

- [ ] **Step 4: Verify the component page renders**

Run: `pnpm dev`, navigate to `/components/actions/button`
Expected: Full component page with playground, controls, examples, and install command.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/[category]/[slug]/page.tsx registry/ui/perimeter/button.demo.tsx
git commit -m "feat: add dynamic component page with playground, examples, and code display"
```

### Task 21: Create source code extraction utility

**Files:**

- Create: `src/lib/extract-source.ts`

- [ ] **Step 1: Write the extraction utility**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Extracts example render function bodies from a demo file's raw source.
 * Returns an array of source code strings, one per example, in order.
 *
 * Convention: all render functions must use the `() => (...)` syntax
 * (parenthesized body). This makes extraction reliable via balanced
 * paren counting. Single-expression JSX without parens is not supported.
 */
export async function extractExampleSources(slug: string): Promise<string[]> {
  const filePath = join(
    process.cwd(),
    "registry",
    "ui",
    "perimeter",
    `${slug}.demo.tsx`,
  );
  const source = await readFile(filePath, "utf-8");

  const sources: string[] = [];
  const renderRegex = /render:\s*\(\)\s*=>\s*\(/g;
  let match;

  while ((match = renderRegex.exec(source)) !== null) {
    // Start after the opening paren
    const startIdx = match.index + match[0].length;
    const body = extractBalancedParens(source, startIdx);
    if (body) sources.push(body.trim());
  }

  return sources;
}

/**
 * Starting just after an opening `(`, find the matching `)` by counting
 * balanced parens. Handles nested parens in JSX expressions, template
 * literals, and string literals (skips quoted content).
 */
function extractBalancedParens(
  source: string,
  startIdx: number,
): string | null {
  let depth = 1;
  let i = startIdx;

  while (i < source.length && depth > 0) {
    const ch = source[i];

    // Skip string literals
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") i++; // skip escaped char
        i++;
      }
    } else if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) {
        return source.slice(startIdx, i);
      }
    }
    i++;
  }

  return null;
}
```

- [ ] **Step 2: Verify it extracts the button demo examples**

Create a test script at `scripts/test-extract.ts`:

```typescript
import { extractExampleSources } from "../src/lib/extract-source";

async function main() {
  const sources = await extractExampleSources("button");
  console.log(`Found ${sources.length} examples`);
  sources.forEach((s, i) => console.log(`\n--- Example ${i + 1} ---\n${s}`));
}
main();
```

Run: `pnpm tsx scripts/test-extract.ts`
Expected: 3 examples printed, each containing the JSX from the button demo's render functions. Delete the test script after verification.

- [ ] **Step 3: Commit**

```bash
git add src/lib/extract-source.ts
git commit -m "feat: add build-time source code extraction for demo examples"
```

---

## Chunk 4: Hub Pages, Landing, and Getting Started

This chunk builds the category hub pages, the main components index, the landing page, and the getting started docs page. After this chunk, all navigation works end-to-end.

### Task 22: Create the components index page

**Files:**

- Create: `src/app/components/page.tsx`

- [ ] **Step 1: Write the components index**

Shows all categories as cards in a grid. Each card displays:

- Category name
- Component count
- List of component names
- Links to `/components/[category]`

Reads from the demo manifest, groups by category.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/components`
Expected: Category cards displayed (will show only "actions" with button until more demos are added).

- [ ] **Step 3: Commit**

```bash
git add src/app/components/page.tsx
git commit -m "feat: add components index page with category grid"
```

### Task 23: Create the category hub page

**Files:**

- Create: `src/app/components/[category]/page.tsx`

- [ ] **Step 1: Write the category hub page**

Uses `generateStaticParams` to enumerate categories from the manifest. Shows a grid of component cards for the category. Each card has:

- Component name
- Description
- Small live preview rendering the component's `Playground` with default prop values (import the demo, instantiate with defaults)
- Link to `/components/[category]/[slug]`

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/components/actions`
Expected: Card grid showing button component.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/[category]/page.tsx
git commit -m "feat: add category hub page with component card grid"
```

### Task 24: Create the landing page

**Files:**

- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the new landing page**

Replace the placeholder with a polished landing page:

- Hero section: "Perimeter Style" heading, description ("A shadcn-compatible component registry for Perimeter Church"), CTA buttons (Browse Components → /components, Get Started → /docs/getting-started)
- Quick Start section: CLI install command with copy button
- Featured components: small live previews of 3-4 key components (button, card, badge, input) linking to their pages
- Stats: "55 Components", "X Themes", "shadcn CLI Compatible"
- Footer with links

Use the frontend-design skill aesthetic principles for this page — it should look polished and distinctive, not generic.

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev`, navigate to `/`
Expected: Polished landing page with working links.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add polished landing page for component showcase"
```

### Task 25: Create getting started docs page

**Files:**

- Create: `src/app/docs/getting-started/page.tsx`
- Create: `src/app/docs/layout.tsx`

- [ ] **Step 1: Create docs layout with sidebar**

`src/app/docs/layout.tsx` — shares the same sidebar component as the components section.

- [ ] **Step 2: Write the getting started page**

Cover:

- Prerequisites (Node.js, pnpm)
- Installing a component: `pnpm dlx shadcn@latest add @perimeter/button`
- Installing the full base: `pnpm dlx shadcn@latest add @perimeter/perimeter-base`
- Theming: how to use `data-theme` attribute, creating a theme JSON
- Dark mode: how `.dark` class works
- Project-specific integration (brief, linking to existing guides)

- [ ] **Step 3: Verify it renders**

Run: `pnpm dev`, navigate to `/docs/getting-started`
Expected: Getting started guide renders with sidebar.

- [ ] **Step 4: Commit**

```bash
git add src/app/docs/
git commit -m "feat: add getting started docs page"
```

### Task 26: Create token reference page

**Files:**

- Create: `src/app/tokens/page.tsx`
- Create: `src/lib/token-usage.ts`
- Create: `src/components/site/token-grid.tsx`
- Create: `src/components/site/token-table.tsx`

- [ ] **Step 1: Create the token usage mapping**

`src/lib/token-usage.ts` — manually maintained mapping of token groups to the components that use them. Example:

```typescript
export const TOKEN_GROUPS = [
  {
    name: "Primary",
    tokens: ["primary", "primary-foreground"],
    usedBy: ["button (default)", "badge (default)", "links"],
  },
  {
    name: "Secondary",
    tokens: ["secondary", "secondary-foreground"],
    usedBy: ["button (secondary)", "badge (secondary)"],
  },
  {
    name: "Destructive",
    tokens: ["destructive", "destructive-foreground"],
    usedBy: [
      "button (destructive)",
      "badge (destructive)",
      "alert (destructive)",
    ],
  },
  {
    name: "Success",
    tokens: ["success", "success-foreground"],
    usedBy: ["alert (success)", "badge (success)"],
  },
  {
    name: "Warning",
    tokens: ["warning", "warning-foreground"],
    usedBy: ["alert (warning)"],
  },
  {
    name: "Info",
    tokens: ["info", "info-foreground"],
    usedBy: ["alert (info)"],
  },
  {
    name: "Background",
    tokens: ["background", "foreground"],
    usedBy: ["page background", "default text color"],
  },
  {
    name: "Muted",
    tokens: ["muted", "muted-foreground"],
    usedBy: ["disabled states", "placeholder text", "secondary text"],
  },
  {
    name: "Accent",
    tokens: ["accent", "accent-foreground"],
    usedBy: ["hover states", "active sidebar items"],
  },
  {
    name: "Card",
    tokens: ["card", "card-foreground"],
    usedBy: ["card", "dialog", "dropdown-menu"],
  },
  {
    name: "Popover",
    tokens: ["popover", "popover-foreground"],
    usedBy: ["popover", "hover-card", "command"],
  },
  {
    name: "Border & Input",
    tokens: ["border", "input", "ring"],
    usedBy: ["input borders", "card borders", "focus rings"],
  },
  {
    name: "Charts",
    tokens: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"],
    usedBy: ["chart"],
  },
  {
    name: "Sidebar",
    tokens: [
      "sidebar",
      "sidebar-foreground",
      "sidebar-primary",
      "sidebar-primary-foreground",
      "sidebar-accent",
      "sidebar-accent-foreground",
      "sidebar-border",
      "sidebar-ring",
    ],
    usedBy: ["sidebar"],
  },
  {
    name: "Layout",
    tokens: ["radius"],
    usedBy: ["all components with rounded corners"],
    isNonColor: true,
  },
];
```

Enumerate all 15 groups corresponding to the token categories. Mark non-color tokens with `isNonColor: true` for separate rendering.

- [ ] **Step 2: Create the token grid view component**

`src/components/site/token-grid.tsx` — a `"use client"` component (needs click-to-copy via `navigator.clipboard`). Reads `default.json` (or current theme) and renders swatches grouped by TOKEN_GROUPS. Each swatch shows light/dark side by side, CSS var name, OKLCH value, click to copy.

- [ ] **Step 3: Create the token table view component**

`src/components/site/token-table.tsx` — a `"use client"` component (needs sort state, filter state, click-to-copy). Sortable, filterable table with columns: Token Name, CSS Variable, Light Value, Dark Value, Preview swatch.

- [ ] **Step 4: Create the tokens page**

`src/app/tokens/page.tsx` — Grid | Table view toggle (client component for toggle state). Renders the selected view. Shows non-color tokens (radius) in a separate section.

- [ ] **Step 5: Verify it renders**

Run: `pnpm dev`, navigate to `/tokens`
Expected: Token grid/table renders with all tokens, view toggle works, copy works.

- [ ] **Step 6: Commit**

```bash
git add src/app/tokens/ src/lib/token-usage.ts src/components/site/token-grid.tsx src/components/site/token-table.tsx
git commit -m "feat: add token reference page with grid/table views and usage context"
```

---

## Chunk 5: Demo Files — All 55 Components

This chunk creates the demo files for all 55 components. Each demo file follows the exact same format established in the spec. This work is highly parallelizable — each demo file is independent.

### Task 27: Create demo files for Actions category (7 components)

**Files:**

- Create: `registry/ui/perimeter/button.demo.tsx` (already created in Task 20, verify it works)
- Create: `registry/ui/perimeter/button-group.demo.tsx`
- Create: `registry/ui/perimeter/toggle.demo.tsx`
- Create: `registry/ui/perimeter/toggle-group.demo.tsx`
- Create: `registry/ui/perimeter/dropdown-menu.demo.tsx`
- Create: `registry/ui/perimeter/context-menu.demo.tsx`
- Create: `registry/ui/perimeter/menubar.demo.tsx`

- [ ] **Step 1: Read each component's source to understand its props and variants**

For each component, read the `.tsx` file in `registry/ui/perimeter/` to identify:

- Exported components and their props
- Variants (from cva or variant prop types)
- Size options
- Key boolean props (disabled, etc.)

- [ ] **Step 2: Write all 7 demo files**

Each demo file must export: `meta`, `controls`, `Playground`, `examples`. Follow the button.demo.tsx pattern. Include at minimum:

- 2-3 examples per component showing common use cases
- Controls for the most important props (variant, size, disabled at minimum)

- [ ] **Step 3: Run collect:demos and verify manifest**

Run: `pnpm collect:demos`
Expected: Manifest shows 7 entries in the actions category.

- [ ] **Step 4: Verify pages render for all 7**

Run: `pnpm dev`, navigate to `/components/actions/button`, `/components/actions/toggle`, etc.
Expected: All 7 pages render correctly.

- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/*.demo.tsx
git commit -m "feat: add demo files for Actions category (7 components)"
```

### Task 28: Create demo files for Forms category (14 components)

**Files:**

- Create demo files for: input, input-group, input-otp, textarea, select, native-select, checkbox, radio-group, switch, slider, combobox, calendar, field, label

**Quality bar (same for all demo tasks):** Each demo file must have: `meta` with all 4 fields, `controls` with at minimum the component's key variant/size/state props, `Playground` rendering the component with control values, and `examples` with 2-3 named examples showing common use cases. All render functions must use the `() => (...)` parenthesized syntax for source extraction compatibility.

- [ ] **Step 1: Read each component's source to understand props and variants**
- [ ] **Step 2: Write all 14 demo files following the button.demo.tsx pattern**
- [ ] **Step 3: Run collect:demos and verify manifest shows 21 total**
- [ ] **Step 4: Verify pages render for all 14**
- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/*.demo.tsx
git commit -m "feat: add demo files for Forms category (14 components)"
```

### Task 29: Create demo files for Data Display category (9 components)

**Files:**

- Create demo files for: card, table, badge, avatar, chart, carousel, progress, skeleton, empty

**Quality bar:** Same as Task 28 — meta (4 fields), controls (key props), Playground, 2-3 examples with `() => (...)` syntax.

- [ ] **Step 1: Read each component's source to understand props and variants**
- [ ] **Step 2: Write all 9 demo files following the button.demo.tsx pattern**
- [ ] **Step 3: Run collect:demos and verify manifest shows 30 total**
- [ ] **Step 4: Verify pages render for all 9**
- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/*.demo.tsx
git commit -m "feat: add demo files for Data Display category (9 components)"
```

### Task 30: Create demo files for Feedback category (9 components)

**Files:**

- Create demo files for: alert, alert-dialog, dialog, drawer, sheet, sonner, tooltip, hover-card, popover

**Quality bar:** Same as Task 28 — meta (4 fields), controls (key props), Playground, 2-3 examples with `() => (...)` syntax.

- [ ] **Step 1: Read each component's source to understand props and variants**
- [ ] **Step 2: Write all 9 demo files following the button.demo.tsx pattern**
- [ ] **Step 3: Run collect:demos and verify manifest shows 39 total**
- [ ] **Step 4: Verify pages render for all 9**
- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/*.demo.tsx
git commit -m "feat: add demo files for Feedback category (9 components)"
```

### Task 31: Create demo files for Navigation category (6 components)

**Files:**

- Create demo files for: breadcrumb, command, navigation-menu, pagination, tabs, sidebar

**Quality bar:** Same as Task 28 — meta (4 fields), controls (key props), Playground, 2-3 examples with `() => (...)` syntax.

- [ ] **Step 1: Read each component's source to understand props and variants**
- [ ] **Step 2: Write all 6 demo files following the button.demo.tsx pattern**
- [ ] **Step 3: Run collect:demos and verify manifest shows 45 total**
- [ ] **Step 4: Verify pages render for all 6**
- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/*.demo.tsx
git commit -m "feat: add demo files for Navigation category (6 components)"
```

### Task 32: Create demo files for Layout category (7 components)

**Files:**

- Create demo files for: accordion, collapsible, resizable, scroll-area, separator, aspect-ratio, direction

**Quality bar:** Same as Task 28 — meta (4 fields), controls (key props), Playground, 2-3 examples with `() => (...)` syntax.

- [ ] **Step 1: Read each component's source to understand props and variants**
- [ ] **Step 2: Write all 7 demo files following the button.demo.tsx pattern**
- [ ] **Step 3: Run collect:demos and verify manifest shows 52 total**
- [ ] **Step 4: Verify pages render for all 7**
- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/*.demo.tsx
git commit -m "feat: add demo files for Layout category (7 components)"
```

### Task 33: Create demo files for Misc category (3 components)

**Files:**

- Create demo files for: kbd, spinner, item

**Quality bar:** Same as Task 28 — meta (4 fields), controls (key props), Playground, 2-3 examples with `() => (...)` syntax.

- [ ] **Step 1: Read each component's source to understand props and variants**
- [ ] **Step 2: Write all 3 demo files following the button.demo.tsx pattern**
- [ ] **Step 3: Run collect:demos and verify manifest shows 55 total**
- [ ] **Step 4: Verify pages render for all 3**
- [ ] **Step 5: Commit**

```bash
git add registry/ui/perimeter/*.demo.tsx
git commit -m "feat: add demo files for Misc category (3 components)"
```

---

## Chunk 6: Templates and Final Integration

This chunk creates the template pages, runs a full build, and verifies everything works end-to-end.

### Task 34: Create template infrastructure

**Files:**

- Create: `src/templates/dashboard.tsx`
- Create: `src/templates/settings.tsx`
- Create: `src/templates/login.tsx`
- Create: `src/templates/data-table.tsx`
- Create: `src/templates/marketing-landing.tsx`

- [ ] **Step 1: Create the 5 template files**

Each template exports `meta` and a default component. The compositions should be realistic and use actual registry components. Import components from `@registry/ui/perimeter/`.

Templates should look polished — aim for warm, clean design with generous whitespace, consistent use of the stone palette tokens, and realistic content (not lorem ipsum).

- [ ] **Step 2: Verify templates import correctly**

Run: `pnpm typecheck`
Expected: No import errors from template files.

- [ ] **Step 3: Commit**

```bash
git add src/templates/
git commit -m "feat: add 5 initial page templates (dashboard, settings, login, data-table, marketing)"
```

### Task 35: Create template gallery and detail pages

**Files:**

- Create: `src/app/templates/page.tsx`
- Create: `src/app/templates/[slug]/page.tsx`

- [ ] **Step 1: Write the template gallery page**

`src/app/templates/page.tsx` — grid of cards. Each card shows:

- Template name and description from `meta`
- Scaled-down live preview using CSS `transform: scale(0.3)` in a fixed-height container with `overflow: hidden`
- List of components used
- Link to detail page

This is a static page (no `generateStaticParams` needed — it's not a dynamic route).

- [ ] **Step 2: Write the template detail page**

`src/app/templates/[slug]/page.tsx` — uses `generateStaticParams` to enumerate template slugs. Renders:

- Full-width live preview (respects current theme + light/dark)
- Preview | Code toggle
- Component list with links to their pages
- Bulk install command

- [ ] **Step 3: Verify template pages render**

Run: `pnpm dev`, navigate to `/templates` and `/templates/dashboard`
Expected: Gallery shows all 5 templates, detail pages render correctly.

- [ ] **Step 4: Commit**

```bash
git add src/app/templates/
git commit -m "feat: add template gallery and detail pages"
```

### Task 36: Update CLAUDE.md for new architecture

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Architecture section**

Replace the Theme Editor Architecture with the new Component Showcase architecture. Update:

- Description: "component showcase site" instead of "theme editor with inline live preview"
- Key Directories table: add `registry/ui/perimeter/`, `src/components/site/`, `src/templates/`, remove editor/preview directories
- Context Loading table: update for new file locations
- Remove the Theme Editor Architecture diagram and state management descriptions

- [ ] **Step 2: Update Commands table**

Add new commands: `pnpm generate:themes`, `pnpm collect:demos`. Update `pnpm build` description.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for component showcase architecture"
```

### Task 37: Full build verification

- [ ] **Step 1: Run quality checks**

Run: `pnpm quality`
Expected: typecheck + lint + format:check all pass.

- [ ] **Step 2: Run full build**

Run: `pnpm build`
Expected: Generates themes.css, collects demos (55), builds registry, Next.js static export completes with all routes generated.

- [ ] **Step 3: Verify the static output**

The project uses `output: "export"` in `next.config.ts` (already configured), so `next build` produces static HTML in the `out/` directory. Check for generated files:

```bash
ls out/index.html
ls out/components/index.html
ls out/components/actions/button.html
ls out/templates/index.html
ls out/tokens/index.html
ls out/docs/getting-started/index.html
```

Expected: All 6 files exist. Open `out/index.html` in a browser to spot-check.

- [ ] **Step 4: Commit any remaining fixes**

Run `git status` to review changes. Stage only the files that were fixed:

```bash
git add <specific files that were fixed>
git commit -m "fix: resolve remaining build issues"
```

- [ ] **Step 5: Final commit for the complete feature**

Only if there are uncommitted changes from the verification pass:

```bash
git status
git add <specific files>
git commit -m "feat: complete component showcase site with all 55 demos, templates, and token reference"
```
