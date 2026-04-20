# Style Audit Fixes & Feature Improvements — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all audit issues (stale docs, broken links, missing error handling, accessibility gaps) and add new features (token search, responsive preview, Compare/Themes tabs, changelog, docs expansion) to the Perimeter Style showcase site.

**Architecture:** Three-tier approach — Tier 1 fixes bugs and doc drift, Tier 2 adds SEO and polish, Tier 3 builds new features. All work happens on a single feature branch. Each task is self-contained with its own commit.

**Tech Stack:** Next.js 16 (static export), React 19, TypeScript 5.9 (strict), Tailwind CSS v4, shadcn registry, Shiki for highlighting

**Spec:** `docs/superpowers/specs/2026-03-30-style-audit-fixes-design.md`

---

## Chunk 1: Tier 1 — Bug Fixes & Doc Cleanup

### Task 1: Create feature branch

**Files:**

- None

- [ ] **Step 1: Create and switch to feature branch**

```bash
cd /Users/parkerb/dev/perimeter/claude/style
git checkout -b feat/audit-fixes-and-features
```

---

### Task 2: Fix stale doc paths — registry.md

**Files:**

- Modify: `docs/architecture/registry.md`

- [ ] **Step 1: Replace all `registry/new-york/` references with `registry/ui/perimeter/`**

In `docs/architecture/registry.md`, find and replace all occurrences:

- `registry/new-york/ui/` → `registry/ui/perimeter/`
- `registry/new-york/lib/` → `registry/lib/` (if exists)
- `registry/new-york/hooks/` → `registry/hooks/` (if exists)

Also update any registry URL references to use `https://style.perimeter.org`.

- [ ] **Step 2: Verify no stale references remain**

Run: `grep -n "new-york\|github\.io" docs/architecture/registry.md`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/registry.md
git commit -m "docs: fix stale paths in registry architecture doc"
```

---

### Task 3: Fix stale doc paths — adding-a-component.md

**Files:**

- Modify: `docs/guides/adding-a-component.md`

- [ ] **Step 1: Replace all `registry/new-york/` references with `registry/ui/perimeter/`**

Same replacement as Task 2 but in `docs/guides/adding-a-component.md`.

- [ ] **Step 2: Verify no stale references remain**

Run: `grep -n "new-york" docs/guides/adding-a-component.md`
Expected: No matches

- [ ] **Step 3: Commit**

```bash
git add docs/guides/adding-a-component.md
git commit -m "docs: fix stale paths in adding-a-component guide"
```

---

### Task 4: Standardize registry URLs across all docs

**Files:**

- Modify: `docs/guides/consuming.md`
- Modify: `docs/guides/project-integration.md`
- Modify: `docs/architecture/registry.md`
- Modify: `scripts/generate-registry.ts`
- Modify: `src/app/docs/getting-started/page.tsx`

- [ ] **Step 1: Update all registry URLs to `https://style.perimeter.org`**

In each file, replace:

- `https://perimeterchurch.github.io/style` → `https://style.perimeter.org`
- `https://style.perimeter.church` → `https://style.perimeter.org`
- `https://perimeter.church` (when used as homepage) → `https://style.perimeter.org`

In `scripts/generate-registry.ts`, find the homepage constant (around line 186-194 area where registry.json is written) and set it to `"https://style.perimeter.org"`.

In `src/app/docs/getting-started/page.tsx`, update the URL in the SECTIONS code snippets (lines 10-89 area).

- [ ] **Step 2: Verify consistency**

Run: `grep -rn "github\.io\|perimeter\.church" docs/ scripts/ src/app/docs/`
Expected: No matches (only `style.perimeter.org` should remain)

- [ ] **Step 3: Commit**

Note: `registry.json` is gitignored (it's a generated file). The homepage URL will update next time `pnpm generate:registry` runs during build.

```bash
git add docs/ scripts/generate-registry.ts src/app/docs/
git commit -m "docs: standardize registry URL to style.perimeter.org"
```

---

### Task 5: Fix docs/README.md index

**Files:**

- Modify: `docs/README.md`

- [ ] **Step 1: Remove references to non-existent files**

Remove these lines from `docs/README.md`:

- The line referencing `architecture/theme-editor.md`
- The line referencing `guides/creating-a-theme.md`

These will be re-added later when the new guides are created in Tier 3.

- [ ] **Step 2: Commit**

```bash
git add docs/README.md
git commit -m "docs: remove references to non-existent doc files"
```

---

### Task 6: Update ROADMAP.md

**Files:**

- Modify: `ROADMAP.md`

- [ ] **Step 1: Update project status**

Move "Component showcase site" from "In Progress" to "Completed" section. Update "High Priority" section:

- Change "Deploy to GitHub Pages" to "Deploy to Vercel" and mark complete (it's already on Vercel)
- Change custom domain to `style.perimeter.org`

- [ ] **Step 2: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: update ROADMAP.md to reflect current project state"
```

---

### Task 7: Add localStorage persistence to theme context

**Files:**

- Modify: `src/lib/theme-context.tsx`

- [ ] **Step 1: Add localStorage read on mount and write on change**

In `src/lib/theme-context.tsx`, modify the `ThemeProvider` component:

1. Add localStorage keys as constants at the top of the file (after imports):

```typescript
const STORAGE_KEY_THEME = "perimeter-style-theme";
const STORAGE_KEY_MODE = "perimeter-style-mode";
```

2. Update `useState` initializers (lines 36-37) to read from localStorage:

```typescript
const [theme, setThemeState] = useState(() => {
  if (typeof window === "undefined") return defaultTheme;
  return localStorage.getItem(STORAGE_KEY_THEME) ?? defaultTheme;
});
const [mode, setModeState] = useState<"light" | "dark">(() => {
  if (typeof window === "undefined") return defaultMode;
  const stored = localStorage.getItem(STORAGE_KEY_MODE);
  return stored === "light" || stored === "dark" ? stored : defaultMode;
});
```

3. Update `setTheme` callback (lines 39-46) to persist:

```typescript
const setTheme = useCallback((t: string) => {
  setThemeState(t);
  localStorage.setItem(STORAGE_KEY_THEME, t);
  if (t) {
    document.documentElement.setAttribute("data-theme", t);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}, []);
```

4. Update `setMode` callback (lines 48-51) to persist:

```typescript
const setMode = useCallback((m: "light" | "dark") => {
  setModeState(m);
  localStorage.setItem(STORAGE_KEY_MODE, m);
  document.documentElement.classList.toggle("dark", m === "dark");
}, []);
```

5. **Replace** the existing `initialModeRef` effect (lines 57-63) with an updated version that applies both persisted theme and mode on first render. Delete the old effect and replace with:

```typescript
const initialRef = useRef(false);
useEffect(() => {
  if (!initialRef.current) {
    initialRef.current = true;
    document.documentElement.classList.toggle("dark", mode === "dark");
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }
}, [mode, theme]);
```

Important: This **replaces** the existing `initialModeRef` effect entirely — do not keep both.

- [ ] **Step 2: Verify the dev server still works**

Run: `pnpm dev` — visit the site, switch themes and dark mode, reload the page, confirm selections persist.

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme-context.tsx
git commit -m "fix: persist theme and mode selections to localStorage"
```

---

### Task 8: Fix broken template component links

**Files:**

- Modify: `src/app/templates/[slug]/page.tsx`

- [ ] **Step 1: Import the demo manifest and add category lookup**

Add import at top of `src/app/templates/[slug]/page.tsx` (after existing imports around line 10):

```typescript
import manifest from "@/lib/demo-manifest.json";
```

Replace the component list section (lines 57-66) with linked badges that resolve to the correct category:

```tsx
{
  /* Component list */
}
<div className="flex flex-wrap items-center gap-2">
  <span className="text-sm font-medium text-muted-foreground">
    Components used:
  </span>
  {meta.components.map((comp) => {
    const entry = manifest.find((e) => e.slug === comp);
    const href = entry
      ? `/components/${entry.category}/${comp}`
      : "/components";
    return (
      <Link key={comp} href={href}>
        <Badge variant="secondary">{comp}</Badge>
      </Link>
    );
  })}
</div>;
```

- [ ] **Step 2: Verify links resolve correctly**

Run: `pnpm dev` — navigate to `/templates/dashboard`, click a component badge, confirm it goes to the correct component detail page.

- [ ] **Step 3: Commit**

```bash
git add src/app/templates/[slug]/page.tsx
git commit -m "fix: link template component badges to correct detail pages"
```

---

### Task 9: Add error boundaries

**Files:**

- Create: `src/app/error.tsx`
- Create: `src/app/components/error.tsx`
- Create: `src/app/templates/error.tsx`
- Create: `src/app/tokens/error.tsx`

- [ ] **Step 1: Create a shared error boundary component**

All four error boundaries share the same structure. Create `src/app/error.tsx`:

```tsx
"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the section-level error boundaries**

Create `src/app/components/error.tsx`, `src/app/templates/error.tsx`, and `src/app/tokens/error.tsx` — each re-exports the same pattern. Since Next.js error boundaries must be in each route segment, create each one:

For each of the three files, write:

```tsx
"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/error.tsx src/app/components/error.tsx src/app/templates/error.tsx src/app/tokens/error.tsx
git commit -m "feat: add error boundaries for all route sections"
```

---

### Task 10: Add error handling to dynamic import in playground

**Files:**

- Modify: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Add error state and `.catch()` handler**

In `src/components/site/component-playground.tsx`:

1. Add an `importError` state after line 64:

```typescript
const [importError, setImportError] = useState<string | null>(null);
```

2. Update the dynamic import effect (lines 67-75) to add `.catch()`:

```typescript
useEffect(() => {
  const importFn = demoImports[slug];
  if (!importFn) {
    setImportError(`No demo found for "${slug}"`);
    return;
  }
  importFn()
    .then((mod) => {
      setPlayground(
        () => mod.Playground as React.ComponentType<Record<string, unknown>>,
      );
    })
    .catch((err: unknown) => {
      setImportError(
        err instanceof Error ? err.message : "Failed to load component demo",
      );
    });
}, [slug]);
```

3. Update the preview render (around lines 118-124) to show error state:

```tsx
<div className="flex min-h-48 items-center justify-center bg-background p-8">
  {importError ? (
    <div className="text-sm text-destructive">{importError}</div>
  ) : Playground ? (
    <Playground {...values} />
  ) : (
    <div className="text-sm text-muted-foreground">Loading...</div>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/site/component-playground.tsx
git commit -m "fix: add error handling to playground dynamic import"
```

---

### Task 11: Fix hardcoded file paths

**Files:**

- Modify: `src/app/tokens/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Fix tokens page path**

In `src/app/tokens/page.tsx`, add `join` import from `node:path` (after the existing `readFileSync` import on line 1):

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
```

Update line 20:

```typescript
// Before:
const raw = readFileSync("registry/themes/default.json", "utf-8");
// After:
const raw = readFileSync(
  join(process.cwd(), "registry", "themes", "default.json"),
  "utf-8",
);
```

- [ ] **Step 2: Fix layout theme discovery path**

In `src/app/layout.tsx`, add `join` import:

```typescript
import { readdirSync } from "node:fs";
import { join } from "node:path";
```

Update line 14:

```typescript
// Before:
const availableThemes = readdirSync("registry/themes");
// After:
const availableThemes = readdirSync(join(process.cwd(), "registry", "themes"));
```

- [ ] **Step 3: Verify build still works**

Run: `pnpm build`
Expected: Build completes successfully

- [ ] **Step 4: Commit**

```bash
git add src/app/tokens/page.tsx src/app/layout.tsx
git commit -m "fix: use absolute paths for build-time file reads"
```

---

### Task 12: Extract shared snippet-building logic

**Files:**

- Create: `src/lib/build-snippet.ts`
- Modify: `src/app/components/[category]/[slug]/page.tsx`
- Modify: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Create the shared module**

Create `src/lib/build-snippet.ts`:

```typescript
import type { ControlsConfig } from "@/lib/demo-types";

export function buildSnippet(
  componentName: string,
  controls: ControlsConfig,
  values?: Record<string, unknown>,
): string {
  const props = Object.entries(controls)
    .filter(([name]) => name !== "children")
    .map(([name, desc]) => {
      const val = values ? (values[name] ?? desc.default) : desc.default;
      if (typeof val === "boolean") return val ? name : `${name}={false}`;
      if (typeof val === "number") return `${name}={${val}}`;
      return `${name}="${val}"`;
    });

  const childrenControl = controls["children"];
  const childrenVal = values
    ? (values["children"] ?? childrenControl?.default)
    : childrenControl?.default;
  const children = childrenVal ? String(childrenVal) : "...";

  const propsStr = props.length > 0 ? " " + props.join(" ") : "";
  return `<${componentName}${propsStr}>${children}</${componentName}>`;
}
```

- [ ] **Step 2: Update component detail page**

In `src/app/components/[category]/[slug]/page.tsx`:

1. Add import (after existing imports):

```typescript
import { buildSnippet } from "@/lib/build-snippet";
```

2. Replace the `buildPlaygroundSnippet` function call on line 55:

```typescript
// Before:
const playgroundCode = buildPlaygroundSnippet(meta.name, controls);
// After:
const playgroundCode = buildSnippet(meta.name, controls);
```

3. Delete the `buildPlaygroundSnippet` function at lines 125-146.

- [ ] **Step 3: Update component playground**

In `src/components/site/component-playground.tsx`:

1. Add import:

```typescript
import { buildSnippet } from "@/lib/build-snippet";
```

2. Replace the `buildCodeSnippet` call inside `updateCodeHighlight` (line 87):

```typescript
// Before:
const code = buildCodeSnippet(componentName, controls, currentValues);
// After:
const code = buildSnippet(componentName, controls, currentValues);
```

3. Delete the `buildCodeSnippet` function at lines 29-48.

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/build-snippet.ts src/app/components/[category]/[slug]/page.tsx src/components/site/component-playground.tsx
git commit -m "refactor: extract shared snippet-building logic to build-snippet.ts"
```

---

### Task 13: Fix ESLint warnings

**Files:**

- Modify: `registry/ui/perimeter/context-menu.demo.tsx`
- Modify: `registry/ui/perimeter/menubar.demo.tsx`

- [ ] **Step 1: Remove unused `_props` parameters**

In `registry/ui/perimeter/context-menu.demo.tsx` line 28, change:

```typescript
// Before:
export function Playground(_props: PlaygroundProps<typeof controls>) {
// After:
export function Playground() {
```

In `registry/ui/perimeter/menubar.demo.tsx` line 28, change:

```typescript
// Before:
export function Playground(_props: PlaygroundProps<typeof controls>) {
// After:
export function Playground() {
```

- [ ] **Step 2: Verify lint passes clean**

Run: `pnpm lint`
Expected: 0 warnings, 0 errors

- [ ] **Step 3: Commit**

```bash
git add registry/ui/perimeter/context-menu.demo.tsx registry/ui/perimeter/menubar.demo.tsx
git commit -m "fix: remove unused playground props to clear ESLint warnings"
```

---

## Chunk 2: Tier 2 — Polish & SEO

### Task 14: Enhance page metadata across all routes

**Files:**

- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/components/page.tsx`
- Modify: `src/app/components/[category]/page.tsx`
- Modify: `src/app/components/[category]/[slug]/page.tsx`
- Modify: `src/app/templates/page.tsx`
- Modify: `src/app/templates/[slug]/page.tsx`
- Modify: `src/app/tokens/page.tsx`
- Modify: `src/app/docs/getting-started/page.tsx`

- [ ] **Step 1: Add openGraph to root layout metadata**

In `src/app/layout.tsx`, enhance the existing metadata export (lines 29-36):

```typescript
export const metadata: Metadata = {
  title: {
    template: "%s — Perimeter Style",
    default: "Perimeter Style — Design System",
  },
  description:
    "shadcn-compatible component registry for Perimeter Church projects",
  openGraph: {
    type: "website",
    siteName: "Perimeter Style",
    description:
      "shadcn-compatible component registry for Perimeter Church projects",
  },
};
```

- [ ] **Step 2: Add metadata to home page**

In `src/app/page.tsx`, add before the component:

```typescript
export const metadata: Metadata = {
  title: "Perimeter Style — Design System",
  description:
    "55 shadcn-compatible components, 5 page templates, and design tokens for Perimeter Church projects.",
  openGraph: {
    title: "Perimeter Style — Design System",
    description:
      "55 shadcn-compatible components, 5 page templates, and design tokens for Perimeter Church projects.",
  },
};
```

Add `import type { Metadata } from "next";` to imports.

- [ ] **Step 3: Add metadata to components index**

In `src/app/components/page.tsx`, add:

```typescript
export const metadata: Metadata = {
  title: "Components",
  description:
    "Browse all components in the Perimeter Style registry, organized by category.",
  openGraph: {
    title: "Components — Perimeter Style",
    description:
      "Browse all components in the Perimeter Style registry, organized by category.",
  },
};
```

- [ ] **Step 4: Enhance category page metadata**

In `src/app/components/[category]/page.tsx`, enhance `generateMetadata` (lines 12-17):

```typescript
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params;
  const title = capitalize(category);
  return {
    title,
    description: `${title} components in the Perimeter Style registry.`,
    openGraph: {
      title: `${title} — Perimeter Style`,
      description: `${title} components in the Perimeter Style registry.`,
    },
  };
}
```

Import `capitalize` from `@/lib/demo-types` if not already imported.

- [ ] **Step 5: Enhance component detail page metadata**

In `src/app/components/[category]/[slug]/page.tsx`, enhance `generateMetadata` (lines 26-32):

```typescript
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = manifest.find((e) => e.slug === slug);
  const name = entry?.name ?? slug;
  const description =
    entry?.description ??
    `${name} component from the Perimeter Style registry.`;
  return {
    title: name,
    description,
    openGraph: {
      title: `${name} — Perimeter Style`,
      description,
    },
  };
}
```

- [ ] **Step 6: Add metadata to templates pages**

In `src/app/templates/page.tsx`, add:

```typescript
export const metadata: Metadata = {
  title: "Templates",
  description:
    "Full-page template compositions built with Perimeter Style components.",
  openGraph: {
    title: "Templates — Perimeter Style",
    description:
      "Full-page template compositions built with Perimeter Style components.",
  },
};
```

In `src/app/templates/[slug]/page.tsx`, enhance `generateMetadata` (lines 18-24):

```typescript
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entry = TEMPLATE_ENTRIES.find((e) => e.slug === slug);
  const name = entry?.meta.name ?? slug;
  const description =
    entry?.meta.description ?? `${name} template from Perimeter Style.`;
  return {
    title: name,
    description,
    openGraph: {
      title: `${name} — Perimeter Style`,
      description,
    },
  };
}
```

- [ ] **Step 7: Enhance tokens page metadata**

In `src/app/tokens/page.tsx`, update the existing metadata (line 10):

```typescript
export const metadata: Metadata = {
  title: "Design Tokens",
  description:
    "All CSS custom properties from the Perimeter Style default theme. OKLCH color format with light and dark mode values.",
  openGraph: {
    title: "Design Tokens — Perimeter Style",
    description:
      "All CSS custom properties from the Perimeter Style default theme.",
  },
};
```

- [ ] **Step 8: Add metadata to getting-started page**

In `src/app/docs/getting-started/page.tsx`, add or enhance the metadata export:

```typescript
export const metadata: Metadata = {
  title: "Getting Started",
  description:
    "Install and configure the Perimeter Style registry in your project.",
  openGraph: {
    title: "Getting Started — Perimeter Style",
    description:
      "Install and configure the Perimeter Style registry in your project.",
  },
};
```

- [ ] **Step 9: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/app/
git commit -m "feat: add description and openGraph metadata to all pages"
```

---

### Task 15: Add sitemap generator and robots.txt

**Files:**

- Create: `scripts/generate-sitemap.ts`
- Create: `public/robots.txt`
- Modify: `package.json`

- [ ] **Step 1: Create robots.txt**

Create `public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://style.perimeter.org/sitemap.xml
```

- [ ] **Step 2: Create sitemap generator script**

Create `scripts/generate-sitemap.ts`:

```typescript
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import manifest from "../src/lib/demo-manifest.json";
import { TEMPLATE_SLUGS } from "../src/templates";

const BASE_URL = "https://style.perimeter.org";

function discoverDocRoutes(): string[] {
  const docsDir = join(process.cwd(), "src", "app", "docs");
  const routes: string[] = [];

  function scan(dir: string, prefix: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const sub = join(dir, entry.name);
        const hasPage = readdirSync(sub).some((f) => f.startsWith("page."));
        if (hasPage) routes.push(`${prefix}/${entry.name}`);
        scan(sub, `${prefix}/${entry.name}`);
      }
    }
  }

  scan(docsDir, "/docs");
  return routes;
}

function generateSitemap(): string {
  const urls: string[] = [
    "/",
    "/components",
    "/templates",
    "/tokens",
    "/changelog",
  ];

  // Doc routes (filesystem-driven)
  urls.push(...discoverDocRoutes());

  // Component category and detail pages
  const categories = new Set<string>();
  for (const entry of manifest) {
    categories.add(entry.category);
    urls.push(`/components/${entry.category}/${entry.slug}`);
  }
  for (const category of categories) {
    urls.push(`/components/${category}`);
  }

  // Template detail pages
  for (const slug of TEMPLATE_SLUGS) {
    urls.push(`/templates/${slug}`);
  }

  const today = new Date().toISOString().split("T")[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>\n    <loc>${BASE_URL}${url}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`).join("\n")}
</urlset>`;

  return xml;
}

const sitemap = generateSitemap();
writeFileSync(join(process.cwd(), "public", "sitemap.xml"), sitemap, "utf-8");
console.log(
  `Generated sitemap.xml with ${sitemap.match(/<url>/g)?.length ?? 0} URLs`,
);
```

- [ ] **Step 3: Add script to package.json and build pipeline**

In `package.json`, add to scripts:

```json
"generate:sitemap": "tsx scripts/generate-sitemap.ts"
```

Update the build command:

```json
"build": "pnpm registry:build && pnpm generate:themes && pnpm collect:demos && pnpm generate:sitemap && next build"
```

- [ ] **Step 4: Run the sitemap generator**

Run: `pnpm generate:sitemap`
Expected: "Generated sitemap.xml with N URLs" (N should be ~70+)

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sitemap.ts public/robots.txt public/sitemap.xml package.json
git commit -m "feat: add sitemap generator and robots.txt"
```

---

### Task 16: Add skip-to-content link and main id

**Files:**

- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add skip link and main landmark**

In `src/app/layout.tsx`, add the skip link as the first child of `<body>` (after line 48), and wrap `{children}` with a `<main>` element:

```tsx
<body className="min-h-full flex flex-col">
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-background focus:p-4 focus:text-foreground focus:shadow-lg"
  >
    Skip to content
  </a>
  <ThemeProvider availableThemes={availableThemes}>
    <TopNav />
    <main id="main" className="flex-1">
      {children}
    </main>
    <SearchPalette />
  </ThemeProvider>
  <Toaster />
</body>
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add skip-to-content link and main landmark"
```

---

### Task 17: Create favicon setup instructions

**Files:**

- Create: `docs/guides/favicon.md`

- [ ] **Step 1: Write the favicon guide**

Create `docs/guides/favicon.md`:

````markdown
# Adding a Favicon

Instructions for adding favicon and app icons to the Perimeter Style showcase site.

## Files to Create

Place these files in `public/`:

| File                   | Format | Size    | Purpose                   |
| ---------------------- | ------ | ------- | ------------------------- |
| `favicon.ico`          | ICO    | 32x32   | Browser tab icon (legacy) |
| `icon.svg`             | SVG    | Any     | Modern browsers, scalable |
| `apple-touch-icon.png` | PNG    | 180x180 | iOS home screen           |

## Update Layout Metadata

In `src/app/layout.tsx`, add the `icons` field to the metadata export:

```typescript
export const metadata: Metadata = {
  // ...existing fields
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};
```
````

## Generating Icons

If you have an SVG source:

1. Use [RealFaviconGenerator](https://realfavicongenerator.net/) to generate all sizes
2. Or use ImageMagick: `convert icon.svg -resize 32x32 favicon.ico`
3. For apple-touch-icon: `convert icon.svg -resize 180x180 apple-touch-icon.png`

## Verification

After adding the files, run `pnpm build` and check the generated HTML in `out/index.html` for the correct `<link>` tags.

````

- [ ] **Step 2: Commit**

```bash
git add docs/guides/favicon.md
git commit -m "docs: add favicon setup instructions"
````

---

### Task 18: Add loading skeletons to playground

**Files:**

- Modify: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Replace "Loading..." with skeleton layout**

In `src/components/site/component-playground.tsx`, replace the loading state in the preview area. Find the `Loading...` text (currently in the preview div) and replace with:

```tsx
{
  importError ? (
    <div className="text-sm text-destructive">{importError}</div>
  ) : Playground ? (
    <Playground {...values} />
  ) : (
    <div className="flex w-full flex-col items-center gap-4 p-8">
      <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
```

Note: Using basic Tailwind pulse animation for the skeleton rather than importing the Skeleton registry component (which would create a circular dependency concern since the playground loads registry demos).

- [ ] **Step 2: Commit**

```bash
git add src/components/site/component-playground.tsx
git commit -m "feat: add loading skeletons to component playground"
```

---

### Task 19: Search palette — deferred to Task 32

Search palette additions depend on routes created in Tier 3 (Tasks 28-31). The new page links (theming, contributing, troubleshooting, changelog) are added in Task 32 alongside the docs sidebar updates to avoid linking to 404 pages.

---

### Task 20: Accessibility improvements

**Files:**

- Modify: `src/components/site/token-grid.tsx`
- Modify: `src/components/site/token-table.tsx`
- Modify: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Add aria-labels to token grid swatches**

In `src/components/site/token-grid.tsx`, find the color swatch elements (the divs that show light/dark colors around lines 40-52). Add `aria-label` to each swatch:

```tsx
<div
  aria-label={`${token} light: ${light}`}
  className="h-8 w-8 rounded border"
  style={{ backgroundColor: light }}
/>
<div
  aria-label={`${token} dark: ${dark}`}
  className="h-8 w-8 rounded border"
  style={{ backgroundColor: dark }}
/>
```

The exact implementation depends on the current JSX structure — add `aria-label` to whichever element renders the color swatch.

- [ ] **Step 2: Add aria-labels to token table swatches**

In `src/components/site/token-table.tsx`, find the color swatch cells and add `aria-label` with format `"{token-name}: {value}"`.

- [ ] **Step 3: Add aria-label to playground tabs**

In `src/components/site/component-playground.tsx`, add `aria-label` to the Tabs wrapper:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} aria-label="Component playground">
```

- [ ] **Step 4: Return focus to search trigger when palette closes**

In `src/components/site/search-palette.tsx`, add a ref to the trigger element and restore focus on close. Find the `setOpen(false)` calls in `onSelect` handlers and add focus restoration. Add at the top of the component:

```typescript
const triggerRef = useRef<HTMLButtonElement>(null);
```

In the `CommandDialog`'s `onOpenChange` handler, restore focus:

```tsx
<CommandDialog
  open={open}
  onOpenChange={(value) => {
    setOpen(value);
    if (!value) triggerRef.current?.focus();
  }}
>
```

Pass `triggerRef` to the `SearchTrigger` component (or add the ref directly if the trigger is in the same file). The exact wiring depends on how `SearchTrigger` is structured — check `src/components/site/search-trigger.tsx` for the trigger element.

- [ ] **Step 5: Verify lint passes**

Run: `pnpm lint`
Expected: 0 warnings, 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/components/site/token-grid.tsx src/components/site/token-table.tsx src/components/site/component-playground.tsx
git commit -m "feat: add aria-labels to token swatches and playground tabs"
```

---

## Chunk 3: Tier 3 — New Features (Part 1)

### Task 21: Token search and filter

**Files:**

- Modify: `src/components/site/token-page-client.tsx`
- Modify: `src/lib/token-usage.ts`

- [ ] **Step 1: Check token-usage.ts for group categories**

Read `src/lib/token-usage.ts` to identify the distinct group names. The category filter buttons will be derived from these groups.

- [ ] **Step 2: Add search and filter to token page client**

In `src/components/site/token-page-client.tsx`, add state for search query and active category filter. Add a toolbar above the existing view toggle:

```tsx
"use client";

import { useState, useMemo } from "react";

import { TokenGrid } from "./token-grid";
import { TokenTable } from "./token-table";

import type { TokenGroup, TokenValues } from "@/lib/token-usage";

type ViewMode = "grid" | "table";

interface TokenPageClientProps {
  groups: TokenGroup[];
  values: TokenValues;
}

export function TokenPageClient({ groups, values }: TokenPageClientProps) {
  const [view, setView] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = useMemo(() => {
    const names = groups.map((g) => g.name);
    return ["all", ...names];
  }, [groups]);

  const filteredGroups = useMemo(() => {
    return groups
      .filter((group) => {
        if (activeCategory === "all") return true;
        return group.name === activeCategory;
      })
      .map((group) => {
        if (!search) return group;
        const filtered = group.tokens.filter((t) =>
          t.toLowerCase().includes(search.toLowerCase()),
        );
        return filtered.length > 0 ? { ...group, tokens: filtered } : null;
      })
      .filter(Boolean) as TokenGroup[];
  }, [groups, search, activeCategory]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search tokens..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all"
                ? "All"
                : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "grid"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "table"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filteredGroups.length === 0 ? (
        <div className="flex min-h-32 items-center justify-center text-sm text-muted-foreground">
          No tokens matching &ldquo;{search}&rdquo;
        </div>
      ) : view === "grid" ? (
        <TokenGrid groups={filteredGroups} values={values} />
      ) : (
        <TokenTable groups={filteredGroups} values={values} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it works**

Run: `pnpm dev` — navigate to `/tokens`, test the search input and category buttons.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/token-page-client.tsx
git commit -m "feat: add token search and category filter to tokens page"
```

---

### Task 22: Copy theme JSON button

**Files:**

- Modify: `src/app/tokens/page.tsx`
- Modify: `src/components/site/token-page-client.tsx`

- [ ] **Step 1: Pass raw theme JSON from server to client**

In `src/app/tokens/page.tsx`, pass the raw JSON string to the client component:

```typescript
function readTokenValues(): { values: TokenValues; rawJson: string } {
  const raw = readFileSync(
    join(process.cwd(), "registry", "themes", "default.json"),
    "utf-8",
  );
  const theme = JSON.parse(raw) as ThemeFile;
  return {
    values: { light: theme.cssVars.light, dark: theme.cssVars.dark },
    rawJson: JSON.stringify(theme.cssVars, null, 2),
  };
}
```

Update the render to pass `rawJson`:

```tsx
export default function TokensPage() {
  const { values, rawJson } = readTokenValues();

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Design Tokens</h1>
        <p className="mt-1 text-muted-foreground">
          All CSS custom properties from the default theme. Click any token to
          copy its CSS variable name.
        </p>
      </div>

      <TokenPageClient
        groups={TOKEN_GROUPS}
        values={values}
        rawJson={rawJson}
      />
    </div>
  );
}
```

- [ ] **Step 2: Add copy button to the token page client**

In `src/components/site/token-page-client.tsx`, add `rawJson` to the props interface and a copy button in the toolbar:

Add to props interface:

```typescript
interface TokenPageClientProps {
  groups: TokenGroup[];
  values: TokenValues;
  rawJson: string;
}
```

Add copy state:

```typescript
const [copied, setCopied] = useState(false);
```

Add copy handler:

```typescript
function copyThemeJson() {
  navigator.clipboard.writeText(rawJson);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}
```

Add copy button in the toolbar (between search and view toggle):

```tsx
<button
  type="button"
  onClick={copyThemeJson}
  className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80"
>
  {copied ? "Copied!" : "Copy JSON"}
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/tokens/page.tsx src/components/site/token-page-client.tsx
git commit -m "feat: add copy theme JSON button to tokens page"
```

---

### Task 23: Component usage snippets

**Files:**

- Modify: `src/app/components/[category]/[slug]/page.tsx`

- [ ] **Step 1: Add usage section to component detail page**

In `src/app/components/[category]/[slug]/page.tsx`, after the breadcrumb and description (around line 89) and before the playground (line 91), add a usage section:

```tsx
{
  /* Usage snippet */
}
<section className="space-y-2">
  <h2 className="text-xl font-semibold">Usage</h2>
  <CodeBlock
    html={usageCodeHtml}
    rawCode={usageCode}
    language="tsx"
    showHeader={false}
  />
</section>;
```

Before the return statement, build the usage snippet:

```typescript
const importName = meta.name.replace(/\s+/g, "");
const usageCode = `import { ${importName} } from "@/components/ui/${slug}";\n\n${playgroundCode}`;
const usageCodeHtml = await highlight(usageCode);
```

Add `CodeBlock` to imports if not already:

```typescript
import { CodeBlock } from "@/components/site/code-block";
```

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev` — navigate to any component detail page, verify the usage section shows an import + JSX snippet.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/[category]/[slug]/page.tsx
git commit -m "feat: add auto-generated usage snippets to component detail pages"
```

---

### Task 24: Bidirectional cross-references — component → template

**Files:**

- Modify: `src/app/components/[category]/[slug]/page.tsx`

- [ ] **Step 1: Add "Used in Templates" section**

In `src/app/components/[category]/[slug]/page.tsx`, import template entries:

```typescript
import { TEMPLATE_ENTRIES } from "@/templates";
```

Before the return statement, find matching templates:

```typescript
const usedInTemplates = TEMPLATE_ENTRIES.filter((t) =>
  t.meta.components.includes(slug),
);
```

After the Installation section (around line 120), add:

```tsx
{
  usedInTemplates.length > 0 && (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Used in Templates</h2>
      <div className="flex flex-wrap gap-2">
        {usedInTemplates.map((t) => (
          <Link key={t.slug} href={`/templates/${t.slug}`}>
            <Badge variant="secondary">{t.meta.name}</Badge>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

Add `Badge` to imports:

```typescript
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Verify it renders**

Run: `pnpm dev` — navigate to a component that's used in templates (e.g., `button`, `card`), verify the "Used in Templates" section appears with clickable links.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/[category]/[slug]/page.tsx
git commit -m "feat: add 'Used in Templates' cross-references to component pages"
```

---

### Task 25: Responsive preview in playground

**Files:**

- Modify: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Add responsive preview state and toolbar**

In `src/components/site/component-playground.tsx`, add state for preview width:

```typescript
const [previewWidth, setPreviewWidth] = useState<number | null>(null);
const [isDragging, setIsDragging] = useState(false);
const previewRef = useRef<HTMLDivElement>(null);
```

Add preset definitions:

```typescript
const WIDTH_PRESETS = [
  { label: "Mobile", width: 375 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: 1280 },
  { label: "Full", width: null },
] as const;
```

Add drag handler:

```typescript
const handleDragStart = useCallback((e: React.PointerEvent) => {
  e.preventDefault();
  setIsDragging(true);
  const startX = e.clientX;
  const startWidth = previewRef.current?.offsetWidth ?? 800;

  function onMove(ev: PointerEvent) {
    const delta = ev.clientX - startX;
    setPreviewWidth(Math.max(320, startWidth + delta));
  }

  function onUp() {
    setIsDragging(false);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}, []);
```

- [ ] **Step 2: Add the preset buttons and resize handle to the Preview tab**

Inside the Preview tab content area, wrap the existing preview div with responsive controls:

```tsx
{
  /* Preview tab content */
}
<div
  className="transition-all duration-300 ease-in-out"
  style={{
    opacity: activeTab === "preview" ? 1 : 0,
    height: activeTab === "preview" ? "auto" : 0,
    overflow: activeTab === "preview" ? "visible" : "hidden",
  }}
>
  {/* Responsive toolbar */}
  <div className="flex items-center gap-1 border-b px-3 py-1.5">
    {WIDTH_PRESETS.map((preset) => (
      <button
        key={preset.label}
        type="button"
        onClick={() => setPreviewWidth(preset.width)}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
          previewWidth === preset.width
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        }`}
      >
        {preset.label}
      </button>
    ))}
    {previewWidth && (
      <span className="ml-2 text-xs text-muted-foreground">
        {previewWidth}px
      </span>
    )}
  </div>

  {/* Preview container with optional width constraint */}
  <div className="flex justify-center bg-background">
    <div
      ref={previewRef}
      className="relative w-full"
      style={{ maxWidth: previewWidth ?? undefined }}
    >
      <div className="flex min-h-48 items-center justify-center p-8">
        {/* ...existing playground/error/loading render... */}
      </div>

      {/* Drag handle */}
      {previewWidth && (
        <div
          onPointerDown={handleDragStart}
          className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize transition-colors hover:bg-primary/20 ${
            isDragging ? "bg-primary/30" : ""
          }`}
        />
      )}
    </div>
  </div>
</div>;
```

- [ ] **Step 3: Verify responsive preview works**

Run: `pnpm dev` — visit a component page, click Mobile/Tablet/Desktop/Full buttons, drag the resize handle.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/component-playground.tsx
git commit -m "feat: add responsive preview with presets and drag handle to playground"
```

---

### Task 25.5: Add `.light` forced-mode class to theme CSS generation

**Files:**

- Modify: `scripts/generate-theme-css.ts`

The Compare tab and Themes tab need to isolate light/dark mode per-pane. The `.dark` class sets dark CSS variables, but there's no way to force light mode on a nested element when the page is in dark mode. We need a `.light` class that re-applies `:root` values.

- [ ] **Step 1: Update generate-theme-css.ts to emit a `.light` class**

In `scripts/generate-theme-css.ts`, after the `:root` block is generated, add a `.light` block with the same light-mode values. Find where the default theme is processed (around lines 37-42) and after the `:root` block, add:

```typescript
// After generating `:root { ... }` block:
blocks.push(cssBlock(".light", defaultTheme.cssVars.light));
```

This emits `.light { --background: ...; --foreground: ...; ... }` with all light-mode values, allowing any element with `class="light"` to force light-mode CSS variables regardless of page mode.

- [ ] **Step 2: Regenerate themes**

Run: `pnpm generate:themes`
Verify that `src/app/globals.css` now contains a `.light { ... }` block after `:root`.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-theme-css.ts src/app/globals.css
git commit -m "feat: add .light forced-mode class to generated theme CSS"
```

---

### Task 26: Compare tab (dark mode side-by-side)

**Files:**

- Modify: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Add Compare tab trigger**

In the `<TabsList>` (around line 104), add:

```tsx
<TabsTrigger value="compare">Compare</TabsTrigger>
```

- [ ] **Step 2: Add Compare tab content**

After the Code tab's content div and before the closing `</div>` of the border container, add a new panel for the Compare tab. Use `.light` class on the light pane to force light-mode CSS variables, and `.dark` on the dark pane:

```tsx
<div
  className="transition-all duration-300 ease-in-out"
  style={{
    opacity: activeTab === "compare" ? 1 : 0,
    height: activeTab === "compare" ? "auto" : 0,
    overflow: activeTab === "compare" ? "visible" : "hidden",
  }}
>
  <div className="grid min-h-48 grid-cols-1 sm:grid-cols-2">
    {/* Light mode */}
    <div className="light border-b p-4 sm:border-b-0 sm:border-r">
      <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
        Light
      </p>
      <div className="flex items-center justify-center rounded-md bg-background p-4">
        {Playground && <Playground {...values} />}
      </div>
    </div>
    {/* Dark mode */}
    <div className="dark p-4">
      <p className="mb-3 text-center text-xs font-medium text-muted-foreground">
        Dark
      </p>
      <div className="flex items-center justify-center rounded-md bg-background p-4">
        {Playground && <Playground {...values} />}
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verify Compare tab works**

Run: `pnpm dev` — visit a component page, click Compare tab, verify light and dark side-by-side render.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/component-playground.tsx
git commit -m "feat: add Compare tab for light/dark side-by-side preview"
```

---

### Task 27: Themes tab

**Files:**

- Modify: `src/components/site/component-playground.tsx`

- [ ] **Step 1: Import useTheme and add Themes tab trigger**

Add import:

```typescript
import { useTheme } from "@/lib/theme-context";
```

Inside the component function, get available themes:

```typescript
const { availableThemes } = useTheme();
```

In the `<TabsList>`, add:

```tsx
<TabsTrigger value="themes">Themes</TabsTrigger>
```

- [ ] **Step 2: Add Themes tab content**

After the Compare tab content, add:

```tsx
<div
  className="transition-all duration-300 ease-in-out"
  style={{
    opacity: activeTab === "themes" ? 1 : 0,
    height: activeTab === "themes" ? "auto" : 0,
    overflow: activeTab === "themes" ? "visible" : "hidden",
  }}
>
  <div className="space-y-6 p-4">
    {["", ...availableThemes].map((themeSlug) => (
      <div key={themeSlug || "default"}>
        <p className="mb-3 text-sm font-medium">
          {themeSlug
            ? themeSlug
                .split("-")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")
            : "Default"}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Light — use .light class to force light-mode CSS variables */}
          <div
            data-theme={themeSlug || undefined}
            className="light flex items-center justify-center rounded-md border bg-background p-4"
          >
            {Playground && <Playground {...values} />}
          </div>
          {/* Dark */}
          <div
            data-theme={themeSlug || undefined}
            className="dark flex items-center justify-center rounded-md border bg-background p-4"
          >
            {Playground && <Playground {...values} />}
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Verify Themes tab works**

Run: `pnpm dev` — visit a component page, click Themes tab, verify all themes render in light/dark grid.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/component-playground.tsx
git commit -m "feat: add Themes tab for cross-theme component comparison"
```

---

## Chunk 4: Tier 3 — New Features (Part 2)

### Task 28: Changelog page

**Files:**

- Create: `CHANGELOG.md`
- Create: `src/app/changelog/page.tsx`
- Modify: `src/components/site/top-nav.tsx`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create CHANGELOG.md**

Create `CHANGELOG.md` at project root:

```markdown
# Changelog

All notable changes to the Perimeter Style registry and showcase site.

Format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added

- Component showcase site with interactive playgrounds for all 55 components
- 5 full-page templates (dashboard, settings, login, data-table, marketing-landing)
- Design token reference page with grid and table views
- Theme switching between default, metrics, and perimeter-api themes
- Dark mode support via .dark class toggle
- Getting started documentation
- shadcn CLI-compatible registry at style.perimeter.org/r/
```

- [ ] **Step 2: Create changelog page**

Create `src/app/changelog/page.tsx`:

```tsx
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Release notes and updates for the Perimeter Style registry.",
  openGraph: {
    title: "Changelog — Perimeter Style",
    description: "Release notes and updates for the Perimeter Style registry.",
  },
};

interface ChangelogSection {
  version: string;
  date: string;
  categories: Record<string, string[]>;
}

function parseChangelog(content: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  let current: ChangelogSection | null = null;
  let currentCategory = "";

  for (const line of content.split("\n")) {
    const versionMatch = line.match(/^## \[(.+?)\](?:\s*-\s*(.+))?/);
    if (versionMatch) {
      if (current) sections.push(current);
      current = {
        version: versionMatch[1],
        date: versionMatch[2]?.trim() ?? "",
        categories: {},
      };
      continue;
    }

    const categoryMatch = line.match(/^### (.+)/);
    if (categoryMatch && current) {
      currentCategory = categoryMatch[1];
      current.categories[currentCategory] = [];
      continue;
    }

    const itemMatch = line.match(/^- (.+)/);
    if (itemMatch && current && currentCategory) {
      current.categories[currentCategory].push(itemMatch[1]);
    }
  }

  if (current) sections.push(current);
  return sections;
}

export default function ChangelogPage() {
  const raw = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf-8");
  const sections = parseChangelog(raw);

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Changelog</h1>
        <p className="mt-1 text-muted-foreground">
          Release notes and updates for the Perimeter Style registry.
        </p>
      </div>

      {sections.map((section) => (
        <article key={section.version} className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-semibold">{section.version}</h2>
            {section.date && (
              <span className="text-sm text-muted-foreground">
                {section.date}
              </span>
            )}
          </div>

          {Object.entries(section.categories).map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {category}
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Add Changelog to top nav**

In `src/components/site/top-nav.tsx`, add to the `NAV_LINKS` array (around lines 7-12):

```typescript
{ href: "/changelog", label: "Changelog" },
```

- [ ] **Step 4: Add CLAUDE.md rule**

In `CLAUDE.md`, add to the "Project-Specific" section under "Critical Rules" (around line 93):

```markdown
- **Update CHANGELOG.md for user-facing changes** — when modifying components, themes, templates, or the showcase site, add an entry under the `[Unreleased]` section in `CHANGELOG.md`
```

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md src/app/changelog/page.tsx src/components/site/top-nav.tsx CLAUDE.md
git commit -m "feat: add changelog page with Keep a Changelog format"
```

---

### Task 29: Docs expansion — theming guide

**Files:**

- Create: `docs/guides/creating-a-theme.md`
- Create: `src/app/docs/theming/page.tsx`

- [ ] **Step 1: Create the theming guide**

Create `docs/guides/creating-a-theme.md`:

````markdown
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
````

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

````

- [ ] **Step 2: Create the docs route**

Create `src/app/docs/theming/page.tsx`:

```tsx
import type { Metadata } from "next";

import { CodeBlock } from "@/components/site/code-block";
import { highlight } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Theming",
  description: "Create project-specific themes for the Perimeter Style registry.",
  openGraph: {
    title: "Theming — Perimeter Style",
    description:
      "Create project-specific themes for the Perimeter Style registry.",
  },
};

const THEME_EXAMPLE = `{
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
}`;

const APPLY_EXAMPLE = `<html data-theme="my-project" class="dark">`;

export default async function ThemingPage() {
  const themeHtml = await highlight(THEME_EXAMPLE, "json");
  const applyHtml = await highlight(APPLY_EXAMPLE, "html");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Creating a Theme</h1>
        <p className="mt-1 text-muted-foreground">
          Project-specific themes override the default token palette. A theme
          only needs to define tokens that differ from the default.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Create a Theme File</h2>
        <p className="text-sm text-muted-foreground">
          Add a JSON file to <code>registry/themes/</code>. The filename becomes
          the theme slug. Only include tokens that differ from the default.
        </p>
        <CodeBlock html={themeHtml} rawCode={THEME_EXAMPLE} language="json" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Token Format</h2>
        <p className="text-sm text-muted-foreground">
          All colors use OKLCH format:{" "}
          <code>oklch(lightness chroma hue)</code>. See{" "}
          <code>registry/themes/default.json</code> for the full token list.
          Common overrides: <code>primary</code>,{" "}
          <code>primary-foreground</code>, <code>ring</code>,{" "}
          <code>chart-1</code>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Build &amp; Apply</h2>
        <p className="text-sm text-muted-foreground">
          Run <code>pnpm generate:themes</code> to inject CSS. Apply in a
          consumer project:
        </p>
        <CodeBlock html={applyHtml} rawCode={APPLY_EXAMPLE} language="html" />
      </section>
    </div>
  );
}
````

Note: The `highlight` function signature should be checked — it may only accept code (not language). If so, adjust to match the existing pattern in `getting-started/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add docs/guides/creating-a-theme.md src/app/docs/theming/page.tsx
git commit -m "docs: add theming guide"
```

---

### Task 30: Docs expansion — contributing guide

**Files:**

- Create: `docs/guides/contributing.md`
- Create: `src/app/docs/contributing/page.tsx`

- [ ] **Step 1: Create the contributing guide**

Create `docs/guides/contributing.md`:

````markdown
# Contributing

How to set up the project locally and contribute changes.

## Setup

```bash
git clone <repo-url>
cd style
pnpm install
pnpm dev
```
````

The dev server starts at `http://localhost:3000` using webpack (Turbopack is disabled due to dynamic import tracing issues).

## Branch Workflow

Always create a feature branch — never commit directly to `dev` or `main`:

```bash
git checkout -b feat/my-change
```

Use conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`.

## Quality Checks

Run before merging:

```bash
pnpm quality    # typecheck + lint + format:check
```

Fix formatting on touched files: `pnpm prettier --write <file>`.

## Adding or Modifying Components

1. Edit the component in `registry/ui/perimeter/`
2. Update or create a `.demo.tsx` file alongside it (see `src/lib/demo-types.ts` for the demo structure)
3. Run `pnpm registry:build` to regenerate the registry
4. Run `pnpm collect:demos` to update the demo manifest
5. Update `CHANGELOG.md` under `[Unreleased]`

## Component Demo Structure

Every demo exports: `meta` (name, description, category, install), `controls` (prop definitions), `Playground` (interactive component), and `examples` (array of named renders). Example render functions must use `() => (...)` syntax.

````

- [ ] **Step 2: Create the docs route**

Create `src/app/docs/contributing/page.tsx`:

```tsx
import type { Metadata } from "next";

import { CodeBlock } from "@/components/site/code-block";
import { highlight } from "@/lib/highlight";

export const metadata: Metadata = {
  title: "Contributing",
  description: "Set up the Perimeter Style project locally and contribute changes.",
  openGraph: {
    title: "Contributing — Perimeter Style",
    description: "Set up the Perimeter Style project locally and contribute changes.",
  },
};

const SETUP = `git clone <repo-url>
cd style
pnpm install
pnpm dev`;

const BRANCH = `git checkout -b feat/my-change`;

const QUALITY = `pnpm quality    # typecheck + lint + format:check`;

export default async function ContributingPage() {
  const setupHtml = await highlight(SETUP, "bash");
  const branchHtml = await highlight(BRANCH, "bash");
  const qualityHtml = await highlight(QUALITY, "bash");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Contributing</h1>
        <p className="mt-1 text-muted-foreground">
          How to set up the project locally and contribute changes.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Setup</h2>
        <CodeBlock html={setupHtml} rawCode={SETUP} language="bash" />
        <p className="text-sm text-muted-foreground">
          The dev server uses webpack (Turbopack is disabled due to dynamic import
          tracing issues with 55 demo files).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Branch Workflow</h2>
        <p className="text-sm text-muted-foreground">
          Always create a feature branch — never commit directly to{" "}
          <code>dev</code> or <code>main</code>. Use conventional prefixes:{" "}
          <code>feat:</code>, <code>fix:</code>, <code>refactor:</code>,{" "}
          <code>chore:</code>, <code>docs:</code>, <code>test:</code>.
        </p>
        <CodeBlock html={branchHtml} rawCode={BRANCH} language="bash" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Quality Checks</h2>
        <p className="text-sm text-muted-foreground">
          Run before merging. Fix formatting on touched files with{" "}
          <code>pnpm prettier --write &lt;file&gt;</code>.
        </p>
        <CodeBlock html={qualityHtml} rawCode={QUALITY} language="bash" />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Adding Components</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Edit the component in <code>registry/ui/perimeter/</code></li>
          <li>Update or create a <code>.demo.tsx</code> file alongside it</li>
          <li>Run <code>pnpm registry:build</code> to regenerate the registry</li>
          <li>Run <code>pnpm collect:demos</code> to update the demo manifest</li>
          <li>Update <code>CHANGELOG.md</code> under <code>[Unreleased]</code></li>
        </ol>
      </section>
    </div>
  );
}
````

- [ ] **Step 3: Commit**

```bash
git add docs/guides/contributing.md src/app/docs/contributing/page.tsx
git commit -m "docs: add contributing guide"
```

---

### Task 31: Docs expansion — troubleshooting guide

**Files:**

- Create: `docs/guides/troubleshooting.md`
- Create: `src/app/docs/troubleshooting/page.tsx`

- [ ] **Step 1: Create the troubleshooting guide**

Create `docs/guides/troubleshooting.md`:

```markdown
# Troubleshooting

Common issues and how to resolve them.

## Dev server hangs on startup

Turbopack cannot trace 55 dynamic demo imports. The `pnpm dev` command already uses `--webpack` to avoid this. If you see a hang, make sure you're running `pnpm dev` (not `next dev` directly).

## Components look outdated

Run `pnpm registry:build` to regenerate the built registry JSON in `public/r/`. This must be run after any change to files in `registry/ui/perimeter/`.

## Theme not applying

Check that the `data-theme` attribute is set on the `<html>` element. For dark mode, ensure the `.dark` class is also present. Run `pnpm generate:themes` if you've modified theme JSON files.

## Demo not showing in showcase

Run `pnpm collect:demos` to regenerate the demo manifest and import map. Verify your demo file exports `meta`, `controls`, `Playground`, and `examples`.

## Build fails with type errors

Run `pnpm typecheck` to see all errors. Common causes: missing return types on async functions, incorrect import paths after moving files.
```

- [ ] **Step 2: Create the docs route**

Create `src/app/docs/troubleshooting/page.tsx`:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Troubleshooting",
  description: "Common issues and solutions for the Perimeter Style project.",
  openGraph: {
    title: "Troubleshooting — Perimeter Style",
    description: "Common issues and solutions for the Perimeter Style project.",
  },
};

const ISSUES = [
  {
    title: "Dev server hangs on startup",
    description:
      "Turbopack cannot trace 55 dynamic demo imports. The pnpm dev command already uses --webpack to avoid this. If you see a hang, make sure you're running pnpm dev (not next dev directly).",
  },
  {
    title: "Components look outdated",
    description:
      "Run pnpm registry:build to regenerate the built registry JSON in public/r/. This must be run after any change to files in registry/ui/perimeter/.",
  },
  {
    title: "Theme not applying",
    description:
      "Check that the data-theme attribute is set on the <html> element. For dark mode, ensure the .dark class is also present. Run pnpm generate:themes if you've modified theme JSON files.",
  },
  {
    title: "Demo not showing in showcase",
    description:
      "Run pnpm collect:demos to regenerate the demo manifest and import map. Verify your demo file exports meta, controls, Playground, and examples.",
  },
  {
    title: "Build fails with type errors",
    description:
      "Run pnpm typecheck to see all errors. Common causes: missing return types on async functions, incorrect import paths after moving files.",
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Troubleshooting</h1>
        <p className="mt-1 text-muted-foreground">
          Common issues and how to resolve them.
        </p>
      </div>

      <div className="space-y-6">
        {ISSUES.map((issue) => (
          <section key={issue.title} className="space-y-2">
            <h2 className="text-lg font-semibold">{issue.title}</h2>
            <p className="text-sm text-muted-foreground">{issue.description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add docs/guides/troubleshooting.md src/app/docs/troubleshooting/page.tsx
git commit -m "docs: add troubleshooting guide"
```

---

### Task 32: Update docs index, sidebar, and search palette

**Files:**

- Modify: `docs/README.md`
- Modify: `src/components/site/docs-sidebar.tsx`
- Modify: `src/components/site/search-palette.tsx`

- [ ] **Step 1: Update docs/README.md**

Add the new guides to the index (the theme-editor and creating-a-theme references were removed in Task 5). Add:

```markdown
- [Creating a Theme](guides/creating-a-theme.md) — create project-specific themes with token overrides
- [Contributing](guides/contributing.md) — set up the project and contribute changes
- [Troubleshooting](guides/troubleshooting.md) — common issues and solutions
- [Favicon Setup](guides/favicon.md) — adding favicon and app icons
```

- [ ] **Step 2: Update docs sidebar**

In `src/components/site/docs-sidebar.tsx`, add navigation links for the new docs pages. Find the existing "Getting Started" link section and add the new pages after it:

```tsx
{ href: "/docs/theming", label: "Theming" },
{ href: "/docs/contributing", label: "Contributing" },
{ href: "/docs/troubleshooting", label: "Troubleshooting" },
```

The exact implementation depends on how the sidebar currently structures its links — follow the existing pattern.

- [ ] **Step 3: Add new pages to search palette**

In `src/components/site/search-palette.tsx`, find the "Pages" section. Add the new doc and changelog pages alongside the existing items:

```tsx
<CommandItem
  onSelect={() => {
    router.push("/docs/theming");
    setOpen(false);
  }}
>
  Theming Guide
</CommandItem>
<CommandItem
  onSelect={() => {
    router.push("/docs/contributing");
    setOpen(false);
  }}
>
  Contributing
</CommandItem>
<CommandItem
  onSelect={() => {
    router.push("/docs/troubleshooting");
    setOpen(false);
  }}
>
  Troubleshooting
</CommandItem>
<CommandItem
  onSelect={() => {
    router.push("/changelog");
    setOpen(false);
  }}
>
  Changelog
</CommandItem>
```

- [ ] **Step 4: Commit**

```bash
git add docs/README.md src/components/site/docs-sidebar.tsx src/components/site/search-palette.tsx
git commit -m "docs: update docs index, sidebar, and search palette with new guides"
```

---

### Task 33: Final quality check and build verification

**Files:** None (verification only)

- [ ] **Step 1: Run full quality suite**

Run: `pnpm quality`
Expected: typecheck passes, lint passes with 0 warnings, format check passes

- [ ] **Step 2: Fix any formatting issues**

Run: `pnpm format`

If files changed, commit:

```bash
git add -A
git commit -m "chore: format files"
```

- [ ] **Step 3: Run full build**

Run: `pnpm build`
Expected: Build completes successfully with static export

- [ ] **Step 4: Spot-check key pages**

Run: `pnpm dev` and verify:

- Home page loads with correct metadata
- Component detail page shows Usage section and "Used in Templates"
- Template detail page has working component links
- Tokens page has search, filter, and copy JSON button
- Playground has Preview (with responsive controls), Code, Compare, and Themes tabs
- Changelog page renders
- All three new docs pages load
- Theme persistence works across page reloads
- Search palette includes all new pages
- Skip-to-content link appears on focus

- [ ] **Step 5: Final commit if needed**

If any fixes were made during spot-checking, commit them with appropriate messages.
