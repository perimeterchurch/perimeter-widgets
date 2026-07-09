# Widget Catalog + MP Login Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A staff-facing Catalog section in the studio SPA (style.perimeter.org) that lists released widgets from the live CDN manifest, shows each one running as its shipped production bundle, generates copyable embed snippets with a config playground, and lets staff sign in through the default MP login widget (popup page) so `auth: 'required'` widgets work end-to-end.

**Architecture:** Two new SPA routes (`/catalog`, `/catalog/:slug`) join the runtime CDN manifest with build-time widget definitions. The live embed runs the real `loader.js` → manifest → immutable bundle chain inside a same-origin `srcdoc` iframe (extending the `BuiltBundlePreview` pattern, prod-visible). MP sign-in lives on a static classic page `studio/public/mp-login.html` (MPWidgets.js only bootstraps from `DOMContentLoaded`, so it can never be lazily injected into the SPA); the token lands in shared-origin localStorage and the embedded widgets' existing `MPLocalStorageAuth` poll unlocks them — zero `widget-runtime` changes.

**Tech Stack:** React 19 + react-router 7 (studio Vite SPA), zod-driven `ConfigPanel` (existing), `@perimeter/auth` (`MPLocalStorageAuth`), remark-frontmatter + remark-mdx-frontmatter (new), vitest + happy-dom, Playwright visual harness.

**Spec:** `docs/superpowers/specs/2026-07-08-widget-catalog-mp-login-design.md` — read it before starting. Key spec constraints: cdn/ is untouched; snippet and preview emit the IDENTICAL attribute set; the srcdoc iframe never gets a `sandbox` attribute; `example` is filtered out.

**Branch:** create `feat/widget-catalog` off `origin/dev`. Never commit to `dev`/`main`. Conventional commits. Run `pnpm format` before `pnpm quality` (the gate runs `format:check`).

**External assumptions (validate before merging Chunk 3):** (1) MP OAuth returns to a `style.perimeter.org` URL carried in `state` with `?cacheKey=<guid>` appended; (2) MP's credentialed-CORS allowlist includes style.perimeter.org (+ localhost for dev). Both are MP-side/owner items — Chunks 1–2 are independent of them; Chunk 3's manual smoke depends on them. See Task 14.

---

## File structure

| File | Responsibility |
| --- | --- |
| `studio/src/lib/catalog.ts` (create) | `CDN_BASE_URL`, `CatalogEntry`, pure `joinCatalog()`, `useCatalog()` hook (manifest fetch + definition/description loading + retry) |
| `studio/src/lib/catalog.test.ts` (create) | join/filter logic + hook states (fetch stubbed) |
| `studio/vite.config.ts` (modify) | add remark-frontmatter plugins to the shared MDX transform |
| `studio/src/lib/widget-docs.ts` (modify) | expose the MDX `frontmatter` export (`widgetDescription()`) |
| `studio/src/lib/widget-docs.test.ts` (create) | frontmatter surfacing |
| `docs/widgets/*.mdx` (modify) + `docs/widgets/sermons.md` → `.mdx` (rename) + `docs/widgets/latest-sermon.md` (delete) | `description:` frontmatter; sermons doc joins the MDX pipeline |
| `studio/src/lib/nav.ts` (modify) + `studio/src/lib/nav.test.ts` (create) + `studio/src/routes.tsx` (modify) | Catalog nav link + the two routes |
| `studio/src/pages/CatalogPage.tsx` (create) + test | landing card grid (skeletons, error/retry, auth badges) |
| `studio/src/lib/embed-snippet.ts` (create) + test | `escapeAttribute()`, `serializeWidgetAttrs()`, `buildEmbedSnippet()` — single source of truth for preview AND snippet attributes |
| `studio/src/components/CdnBundlePreview.tsx` (create) + test | prod-visible srcdoc iframe running the real loader chain, postMessage error channel |
| `studio/src/pages/CatalogWidgetPage.tsx` (create) + test | viewer composition: login panel / embed / playground / snippet / docs link |
| `studio/public/mp-login.html` (create) | static classic page hosting MPWidgets + `<mpp-user-login>`, cacheKey self-close |
| `studio/src/components/MpLoginPanel.tsx` (create) + test | sign-in state (via `MPLocalStorageAuth`) + popup opener + blocked fallback |
| `studio/package.json` (modify) | add `@perimeter/auth` dep; add remark plugins |
| `packages/auth/tests/mp-local-storage-auth.test.ts` (modify) | fixture for MPWidgets' native `Date.toString()` ExpiresAfter format |
| `studio/visual/catalog.spec.ts` (create) + `studio/visual/helpers.ts` (modify) | hermetic Playwright spec (fixture manifest, committed cdn files served locally) |

---

## Chunk 1: Catalog foundation (data hook, frontmatter descriptions, landing page)

### Task 0: Branch setup

- [ ] **Step 0.1:** From the repo root (`perimeter-widgets/`):

```bash
git fetch origin && git checkout -b feat/widget-catalog origin/dev
pnpm install
```

Expected: new branch tracking origin/dev; install is a no-op or fast.

### Task 1: Catalog data module — pure join + `CDN_BASE_URL`

**Files:**
- Create: `studio/src/lib/catalog.ts`
- Test: `studio/src/lib/catalog.test.ts`

- [ ] **Step 1.1: Write the failing test for the pure join**

Create `studio/src/lib/catalog.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { joinCatalog } from './catalog';

function def(name: string, auth: 'required' | 'optional' | 'none' = 'none'): WidgetDefinition {
  return { name, auth, schema: z.object({}), App: () => null };
}

describe('joinCatalog', () => {
  it('joins manifest entries with loaded definitions, sorted by slug', () => {
    const entries = joinCatalog(
      { sermons: '1.4.2', 'my-shepherds': '0.1.0' },
      new Map([
        ['sermons', { definition: def('sermons'), description: 'Browse sermons.' }],
        ['my-shepherds', { definition: def('my-shepherds', 'required'), description: undefined }],
      ]),
    );
    expect(entries.map((e) => e.slug)).toEqual(['my-shepherds', 'sermons']);
    expect(entries[1]).toMatchObject({ slug: 'sermons', version: '1.4.2' });
    expect(entries[1]!.definition?.auth).toBe('none');
    expect(entries[1]!.description).toBe('Browse sermons.');
  });

  it('excludes the example widget', () => {
    const entries = joinCatalog({ example: '0.0.1', sermons: '1.4.2' }, new Map());
    expect(entries.map((e) => e.slug)).toEqual(['sermons']);
  });

  it('keeps stale manifest entries (no repo definition) without a definition', () => {
    const entries = joinCatalog({ ghost: '2.0.0' }, new Map());
    expect(entries).toEqual([{ slug: 'ghost', version: '2.0.0' }]);
  });
});
```

- [ ] **Step 1.2: Run it to verify it fails**

```bash
pnpm --filter @perimeter/studio test src/lib/catalog.test.ts
```

Expected: FAIL — `Cannot find module './catalog'` (or similar unresolved import).

- [ ] **Step 1.3: Implement the pure part of `catalog.ts`**

Create `studio/src/lib/catalog.ts` — **only** the pure part; no react/discovery/widget-docs imports yet (`widgetDescription` doesn't exist until Task 2 — importing it here would fail this task's PASS step at module link time). Task 3 adds the hook and its imports.

```ts
import type { WidgetDefinition } from '@perimeter/widget-runtime';

/** Single source of truth for the CDN origin — tests and any future staging host override here. */
export const CDN_BASE_URL = 'https://widgets.perimeter.org';

export interface CatalogEntry {
  slug: string;
  version: string;
  /** Absent when the manifest lists a widget the repo no longer has (stale entry). */
  definition?: WidgetDefinition;
  /** From `description:` frontmatter in docs/widgets/<slug>.mdx; absent when none. */
  description?: string;
}

export interface LoadedWidgetMeta {
  definition: WidgetDefinition;
  description?: string | undefined;
}

/**
 * Pure join of the CDN manifest with the repo's loaded widget metadata: only
 * released widgets appear, `example` (internal reference widget) is hidden, and
 * a manifest entry with no repo definition still shows up (reduced card).
 */
export function joinCatalog(
  manifest: Record<string, string>,
  loaded: Map<string, LoadedWidgetMeta>,
): CatalogEntry[] {
  return Object.entries(manifest)
    .filter(([slug]) => slug !== 'example')
    .map(([slug, version]): CatalogEntry => {
      const meta = loaded.get(slug);
      if (!meta) return { slug, version };
      const entry: CatalogEntry = { slug, version, definition: meta.definition };
      if (meta.description !== undefined) entry.description = meta.description;
      return entry;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
```

- [ ] **Step 1.4: Run the test to verify it passes**

```bash
pnpm --filter @perimeter/studio test src/lib/catalog.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 1.5: Commit**

```bash
git add studio/src/lib/catalog.ts studio/src/lib/catalog.test.ts
git commit -m "feat(studio): catalog join logic + CDN base constant"
```

### Task 2: MDX frontmatter pipeline + widget descriptions

**Files:**
- Modify: `studio/package.json` (devDependencies), `studio/vite.config.ts:27`, `studio/src/lib/widget-docs.ts`
- Create: `studio/src/lib/widget-docs.test.ts`
- Modify: `docs/widgets/*.mdx` (frontmatter), rename `docs/widgets/sermons.md` → `sermons.mdx`, delete `docs/widgets/latest-sermon.md`

Background: the MDX transform is shared by dev/build/vitest (one `vite.config.ts`). Without `remark-frontmatter`, a `---` block renders as visible content; without `remark-mdx-frontmatter`, there is no `frontmatter` export. `widget-docs.ts` deliberately ignores `.md`, so `sermons.md` must convert. **`latest-sermon.mdx` already exists** — its `.md` sibling is a stale planning doc: delete it, never convert it.

- [ ] **Step 2.1: Add the remark plugins**

```bash
pnpm --filter @perimeter/studio add -D remark-frontmatter remark-mdx-frontmatter
```

- [ ] **Step 2.2: Wire them into the MDX transform**

In `studio/vite.config.ts`, add imports and extend the mdx plugin options:

```ts
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
```

```ts
    // Frontmatter: strip `---` blocks from rendered output and expose them as a
    // `frontmatter` named export (catalog card descriptions read it).
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
      }),
    },
```

- [ ] **Step 2.3: Write the failing test for `widgetDescription`**

Create `studio/src/lib/widget-docs.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { widgetDoc, widgetDescription } from './widget-docs';

// Asserts against the REAL repo docs (globs resolve from repo root in tests,
// same as the dev server) — my-shepherds gains frontmatter in this task.
describe('widget docs frontmatter', () => {
  it('exposes the description frontmatter of a real widget doc', async () => {
    const description = await widgetDescription('my-shepherds');
    expect(description).toBeTruthy();
    expect(typeof description).toBe('string');
  });

  it('returns null for a widget with no doc', async () => {
    expect(await widgetDescription('nope-not-a-widget')).toBeNull();
  });

  it('still exposes the component loader', () => {
    expect(widgetDoc('my-shepherds')).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2.4: Run it to verify it fails**

```bash
pnpm --filter @perimeter/studio test src/lib/widget-docs.test.ts
```

Expected: FAIL — `widgetDescription` is not exported.

- [ ] **Step 2.5: Implement `widgetDescription` in `widget-docs.ts`**

Replace the `DocLoader` type and add the helper (keep `widgetDoc` as-is):

```ts
import type { ComponentType } from 'react';

interface DocModule {
  default: ComponentType;
  /** Exposed by remark-mdx-frontmatter; absent for docs without frontmatter. */
  frontmatter?: { description?: string };
}
type DocLoader = () => Promise<DocModule>;
```

And below `widgetDoc`:

```ts
/**
 * The widget doc's `description:` frontmatter, or null when the widget has no
 * doc or the doc has no description. Loads the MDX chunk (small; catalog cards
 * are the only consumer).
 */
export async function widgetDescription(slug: string): Promise<string | null> {
  const load = docsBySlug[slug];
  if (!load) return null;
  const mod = await load();
  return mod.frontmatter?.description ?? null;
}
```

- [ ] **Step 2.6: Add frontmatter to every widget doc**

For each of `docs/widgets/my-shepherds.mdx`, `my-giving-history.mdx`, `latest-sermon.mdx`, `event-finder.mdx`, prepend (adjusting text per widget):

```mdx
---
description: One sentence of what this widget shows, staff-facing.
---
```

Suggested texts — my-shepherds: "The signed-in member's assigned shepherds and elders, with contact actions."; my-giving-history: "The signed-in member's giving history with yearly chart and statement filters."; latest-sermon: "The most recent sermon with quick links to watch or listen."; event-finder: "Browse and filter upcoming Perimeter events."

- [ ] **Step 2.7: Convert sermons.md → sermons.mdx and delete the stale planning doc**

```bash
git mv docs/widgets/sermons.md docs/widgets/sermons.mdx
git rm docs/widgets/latest-sermon.md
```

Then open `docs/widgets/sermons.mdx`, prepend a `description:` frontmatter block ("Browse, search, and watch sermons — series, speakers, and PDF outlines."), and **read the whole file**: MDX is stricter than MD — raw `<` followed by a non-tag, `{`…`}` expressions, or unclosed HTML will now be compile errors. Fix anything that fails the next step (usually escaping `<` as `\<` or fencing snippets in code blocks).

- [ ] **Step 2.8: Verify the whole studio still builds and tests pass**

```bash
pnpm --filter @perimeter/studio test
pnpm --filter @perimeter/studio build
```

Expected: all studio tests PASS (including Step 2.3's) and the build succeeds — the build compiles every repo-root MDX file, so it is the real gate for the sermons conversion and the frontmatter blocks. If the build fails on an MDX file, fix its content (Step 2.7 guidance) and re-run.

- [ ] **Step 2.9: Visually spot-check no rendered frontmatter**

```bash
pnpm dev
```

Open `http://localhost:5173/widgets/my-shepherds` — the doc below the canvas must NOT show a literal `---` or `description:` text (frontmatter stripped). Also check `/widgets/sermons` now renders its doc. Stop the dev server.

- [ ] **Step 2.10: Commit**

```bash
git add -A
git commit -m "feat(studio): MDX frontmatter pipeline + widget doc descriptions"
```

### Task 3: `useCatalog()` hook

**Files:**
- Modify: `studio/src/lib/catalog.ts`, `studio/src/lib/catalog.test.ts`

- [ ] **Step 3.1: Write the failing hook tests** (append to `catalog.test.ts`)

```tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { useCatalog } from './catalog';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubManifest(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      json: () => Promise.resolve(body),
    }),
  );
}

describe('useCatalog', () => {
  it('loads released widgets with definitions from real discovery', async () => {
    // my-shepherds exists in the repo; `ghost` is a stale manifest entry.
    stubManifest({ 'my-shepherds': '0.1.0', ghost: '9.9.9', example: '0.0.1' });
    const { result } = renderHook(() => useCatalog());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
    const slugs = result.current.entries.map((e) => e.slug);
    expect(slugs).toEqual(['ghost', 'my-shepherds']); // example filtered, sorted
    expect(result.current.entries[1]!.definition?.auth).toBe('required');
    expect(result.current.entries[0]!.definition).toBeUndefined();
  });

  it('surfaces a fetch failure as error and retry re-fetches', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', failing);
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    stubManifest({ 'my-shepherds': '0.1.0' });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.entries.map((e) => e.slug)).toEqual(['my-shepherds']);
  });

  it('treats a non-ok response as an error', async () => {
    stubManifest({}, /* ok */ false);
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
```

- [ ] **Step 3.2: Run to verify failure**

```bash
pnpm --filter @perimeter/studio test src/lib/catalog.test.ts
```

Expected: FAIL — `useCatalog` is not exported.

- [ ] **Step 3.3: Implement `useCatalog` in `catalog.ts`**

Add the imports Task 1 deliberately left out, at the top of `catalog.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { toWidgetEntries, widgetDefGlob, widgetCssGlob } from './discovery';
import { widgetDescription } from './widget-docs';
```

Then append:

```ts
export interface UseCatalogResult {
  entries: CatalogEntry[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Fetch the live CDN manifest and join it with the repo's widget definitions
 * (+ doc descriptions). Discovery importers are lazy, so every released
 * widget's module is awaited here; `definition` is only authoritative once
 * `isLoading` is false.
 */
export function useCatalog(): UseCatalogResult {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      const res = await fetch(`${CDN_BASE_URL}/manifest.json`);
      if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
      const manifest = (await res.json()) as Record<string, string>;
      const widgets = toWidgetEntries(widgetDefGlob, widgetCssGlob);
      const loaded = new Map<string, LoadedWidgetMeta>();
      await Promise.all(
        Object.keys(manifest).map(async (slug) => {
          if (slug === 'example') return; // joinCatalog filters it — skip its module load too
          const entry = widgets.find((w) => w.slug === slug);
          if (!entry) return;
          const [{ default: definition }, description] = await Promise.all([
            entry.load(),
            widgetDescription(slug),
          ]);
          loaded.set(slug, { definition, description: description ?? undefined });
        }),
      );
      if (cancelled) return;
      setEntries(joinCatalog(manifest, loaded));
      setIsLoading(false);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { entries, isLoading, error, retry };
}
```

- [ ] **Step 3.4: Run to verify pass**

```bash
pnpm --filter @perimeter/studio test src/lib/catalog.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 3.5: Commit**

```bash
git add studio/src/lib/catalog.ts studio/src/lib/catalog.test.ts
git commit -m "feat(studio): useCatalog hook joining CDN manifest with discovery"
```

### Task 4: Routes + nav link

**Files:**
- Create: `studio/src/lib/nav.test.ts` (no `buildNav` test exists today — `Sidebar.test.tsx` renders a hand-written fixture and never imports `buildNav`, so it cannot go red for this change)
- Modify: `studio/src/lib/nav.ts:29-45`, `studio/src/routes.tsx`

- [ ] **Step 4.1: Write the failing `buildNav` test**

Create `studio/src/lib/nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildNav } from './nav';

describe('buildNav', () => {
  it('puts a single static Catalog link first (catalog membership is runtime data)', () => {
    const nav = buildNav([], []);
    expect(nav[0]).toEqual({
      label: 'Catalog',
      items: [{ to: '/catalog', label: 'Widget catalog' }],
    });
  });
});
```

Run `pnpm --filter @perimeter/studio test src/lib/nav.test.ts` — expect FAIL (first group is `Widgets`).

- [ ] **Step 4.2: Implement** — in `buildNav` (`studio/src/lib/nav.ts`), prepend the group to the returned array (membership depends on the runtime manifest, so this is deliberately a single static link — `buildNav` stays pure/synchronous):

```ts
    {
      label: 'Catalog',
      items: [{ to: '/catalog', label: 'Widget catalog' }],
    },
```

Run `pnpm --filter @perimeter/studio test src/lib/nav.test.ts` — expect PASS.

> Heads-up: the new sidebar group will invalidate committed Playwright screenshot baselines (`studio/visual/screenshot-baselines.spec.ts-snapshots`). That is expected — baselines are reconciled in the Chunk 3 visual task (Task 12), where any intentional diffs are updated with `pnpm --filter @perimeter/studio visual -- --update-snapshots`. Don't chase them mid-chunk.

- [ ] **Step 4.3: Add the routes** — in `studio/src/routes.tsx`, add the imports:

```tsx
import { CatalogPage } from './pages/CatalogPage';
import { CatalogWidgetPage } from './pages/CatalogWidgetPage';
```

and inside the Layout `children` array before the `*` entry:

```tsx
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'catalog/:slug', element: <CatalogWidgetPage /> },
```

For now create minimal placeholder pages so the app compiles (real pages: Tasks 5 and 9):

`studio/src/pages/CatalogPage.tsx`:

```tsx
export function CatalogPage() {
  return <div className="p-6" />;
}
```

`studio/src/pages/CatalogWidgetPage.tsx`:

```tsx
export function CatalogWidgetPage() {
  return <div className="p-6" />;
}
```

- [ ] **Step 4.4: Verify + commit**

```bash
pnpm --filter @perimeter/studio test
pnpm --filter @perimeter/studio typecheck
git add -A && git commit -m "feat(studio): catalog routes + nav link"
```

### Task 5: Catalog landing page

**Files:**
- Modify: `studio/src/pages/CatalogPage.tsx`
- Test: `studio/src/pages/CatalogPage.test.tsx`

- [ ] **Step 5.1: Write the failing tests**

Create `studio/src/pages/CatalogPage.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, within, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CatalogPage } from './CatalogPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubManifest(body: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(body) }),
  );
}

function renderPage() {
  return render(
    <MemoryRouter>
      <CatalogPage />
    </MemoryRouter>,
  );
}

describe('CatalogPage', () => {
  it('shows skeleton cards while loading, then real cards', async () => {
    stubManifest({ 'my-shepherds': '0.1.0', sermons: '1.4.2' });
    const { container } = renderPage();
    expect(container.querySelector('[data-testid="catalog-skeleton"]')).toBeTruthy();
    const ui = within(container);
    const link = await ui.findByRole('link', { name: /my shepherds/i });
    expect(link.getAttribute('href')).toBe('/catalog/my-shepherds');
    expect(within(link).getByText('0.1.0')).toBeTruthy();
    // auth: 'required' → badge
    expect(within(link).getByText(/sign-in required/i)).toBeTruthy();
  });

  it('renders an error banner with retry on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { container } = renderPage();
    const ui = within(container);
    const retry = await ui.findByRole('button', { name: /retry/i });
    stubManifest({ sermons: '1.4.2' });
    fireEvent.click(retry);
    await waitFor(() => expect(ui.getByRole('link', { name: /sermons/i })).toBeTruthy());
  });
});
```

- [ ] **Step 5.2: Run to verify failure**

```bash
pnpm --filter @perimeter/studio test src/pages/CatalogPage.test.tsx
```

Expected: FAIL (placeholder page renders nothing).

- [ ] **Step 5.3: Implement `CatalogPage`**

```tsx
import { Link } from 'react-router';
import { Card } from '@perimeter/ui/card';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { Skeleton } from '@perimeter/ui/skeleton';
import { useCatalog, type CatalogEntry } from '../lib/catalog';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { titleFromSlug } from '../lib/labels';

/**
 * Staff-facing catalog: every RELEASED widget (live CDN manifest ∩ repo
 * definitions, `example` hidden) as a card linking to its viewer. No live
 * embeds here — the grid stays fast with zero iframes.
 */
export function CatalogPage() {
  const { entries, isLoading, error, retry } = useCatalog();

  return (
    <div className="p-6">
      <Breadcrumbs crumbs={[{ label: 'Home', to: '/' }, { label: 'Catalog' }]} />
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Widget catalog</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-fg">
        Released widgets running on widgets.perimeter.org. Open one to see it live, tune its
        options, and copy the embed snippet.
      </p>

      {error ? (
        <div role="alert" className="mt-6 space-y-2 rounded-md border border-border bg-muted p-4">
          <p className="text-sm text-fg">Couldn&apos;t reach widgets.perimeter.org: {error}</p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div
          data-testid="catalog-skeleton"
          className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
        >
          {[0, 1, 2].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {entries.map((entry) => (
            <CatalogCard key={entry.slug} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatalogCard({ entry }: { entry: CatalogEntry }) {
  return (
    <Link to={`/catalog/${entry.slug}`} className="block focus:outline-hidden">
      <Card className="h-full space-y-2 p-5 transition-colors hover:border-ring">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-fg">{titleFromSlug(entry.slug)}</span>
          <code className="text-xs text-muted-fg">{entry.version}</code>
        </div>
        {entry.definition?.auth === 'required' && <Badge>Sign-in required</Badge>}
        {entry.definition?.auth === 'optional' && (
          <Badge variant="outline">Personalized when signed in</Badge>
        )}
        {entry.description && <p className="text-sm text-muted-fg">{entry.description}</p>}
      </Card>
    </Link>
  );
}
```

If `@perimeter/ui/badge` does not exist (check `packages/ui/src/`), substitute a small inline `<span className="inline-flex rounded-full border border-border px-2 py-0.5 text-xs text-muted-fg">` and drop the import.

- [ ] **Step 5.4: Run to verify pass, then the full studio gate**

```bash
pnpm --filter @perimeter/studio test src/pages/CatalogPage.test.tsx
pnpm --filter @perimeter/studio test && pnpm --filter @perimeter/studio typecheck
```

Expected: PASS.

- [ ] **Step 5.5: Manual check + commit**

`pnpm dev` → `http://localhost:5173/catalog` shows real cards (live manifest). Stop server.

```bash
git add -A && git commit -m "feat(studio): catalog landing page with cards, skeletons, retry"
```

- [ ] **Step 5.6: Chunk 1 gate**

```bash
pnpm format && pnpm quality
```

Expected: green across the workspace. Commit any formatting deltas as part of the last commit (`git commit --amend --no-edit`) — never a formatting-only commit.

---

## Chunk 2: Viewer page (snippet lib, CDN preview, composition)

### Task 6: `embed-snippet.ts` — escaping + the single attribute source of truth

**Files:**
- Create: `studio/src/lib/embed-snippet.ts`
- Test: `studio/src/lib/embed-snippet.test.ts`

The spec's core rule: **the preview and the snippet emit the identical attribute set** — every override currently set in the playground (no diffing against schema defaults), serialized camelCase→kebab, HTML-attribute-escaped (net-new; `configToDataAttrs` interpolates raw and stays untouched for the Inspector). `data-theme="dark"` appended only when dark. `data-nowprocket` appears in the copyable snippet only (canonical WordPress form per `docs/hosting-and-release.md`), never in the srcdoc.

- [ ] **Step 6.1: Write the failing tests**

Create `studio/src/lib/embed-snippet.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { escapeAttribute, serializeWidgetAttrs, buildEmbedSnippet } from './embed-snippet';

describe('escapeAttribute', () => {
  it('escapes &, ", <, >', () => {
    expect(escapeAttribute('a & "b" <c>')).toBe('a &amp; &quot;b&quot; &lt;c&gt;');
  });
});

describe('serializeWidgetAttrs', () => {
  it('emits the widget attr plus sorted kebab-case overrides, escaped', () => {
    expect(
      serializeWidgetAttrs('sermons', { perPage: 20, title: 'Q&A "live"' }, 'light'),
    ).toBe(
      'data-perimeter-widget="sermons" data-per-page="20" data-title="Q&amp;A &quot;live&quot;"',
    );
  });

  it('skips undefined/null/empty values and appends data-theme only when dark', () => {
    expect(serializeWidgetAttrs('sermons', { a: undefined, b: null, c: '' }, 'dark')).toBe(
      'data-perimeter-widget="sermons" data-theme="dark"',
    );
  });
});

describe('buildEmbedSnippet', () => {
  it('is the canonical loader form: script first with data-nowprocket, then the div', () => {
    expect(buildEmbedSnippet('sermons', { perPage: 20 }, 'dark')).toBe(
      '<script src="https://widgets.perimeter.org/loader.js" data-nowprocket async></script>\n' +
        '<div data-perimeter-widget="sermons" data-per-page="20" data-theme="dark"></div>',
    );
  });
});
```

- [ ] **Step 6.2: Run to verify failure**

```bash
pnpm --filter @perimeter/studio test src/lib/embed-snippet.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement**

Create `studio/src/lib/embed-snippet.ts`:

```ts
import { camelToKebab } from './data-attr';
import { CDN_BASE_URL } from './catalog';

/** HTML attribute-value escaping — configToDataAttrs interpolates raw (Inspector-only). */
export function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export type PreviewTheme = 'light' | 'dark';

/**
 * The FULL attribute set of a catalog embed div — used verbatim by BOTH the
 * CdnBundlePreview srcdoc and the copyable snippet, so they can never drift.
 * Every set override appears (no schema-default diffing; the playground's
 * override map starts empty). `data-theme` only when dark.
 */
export function serializeWidgetAttrs(
  slug: string,
  overrides: Record<string, unknown>,
  theme: PreviewTheme,
): string {
  const attrs = [`data-perimeter-widget="${escapeAttribute(slug)}"`];
  for (const key of Object.keys(overrides).sort()) {
    const value = overrides[key];
    if (value === undefined || value === null || value === '') continue;
    attrs.push(`data-${camelToKebab(key)}="${escapeAttribute(String(value))}"`);
  }
  if (theme === 'dark') attrs.push('data-theme="dark"');
  return attrs.join(' ');
}

/**
 * The copyable embed snippet — the canonical WordPress form from
 * docs/hosting-and-release.md (loader script first, data-nowprocket for WP
 * Rocket hosts, then the placeholder div).
 */
export function buildEmbedSnippet(
  slug: string,
  overrides: Record<string, unknown>,
  theme: PreviewTheme,
): string {
  return (
    `<script src="${CDN_BASE_URL}/loader.js" data-nowprocket async></script>\n` +
    `<div ${serializeWidgetAttrs(slug, overrides, theme)}></div>`
  );
}
```

- [ ] **Step 6.4: Run to verify pass + commit**

```bash
pnpm --filter @perimeter/studio test src/lib/embed-snippet.test.ts
git add studio/src/lib/embed-snippet.ts studio/src/lib/embed-snippet.test.ts
git commit -m "feat(studio): embed snippet builder with attribute escaping"
```

### Task 7: `CdnBundlePreview`

**Files:**
- Create: `studio/src/components/CdnBundlePreview.tsx`
- Test: `studio/src/components/CdnBundlePreview.test.tsx`
- Read first: `studio/src/components/BuiltBundlePreview.tsx` (the pattern being extended) and its test `BuiltBundlePreview.test.tsx`

Differences from `BuiltBundlePreview`: prod-visible (no DEV gate), loads `${CDN_BASE_URL}/loader.js` (real loader→manifest→bundle chain; `loader.js` resolves its origin from `document.currentScript.src`, which is absolute here, so it works in `about:srcdoc`), div attributes come from `serializeWidgetAttrs` (identical to the snippet), and its own postMessage type. **Never add a `sandbox` attribute** — it would sever the shared-origin localStorage the MP login flow depends on.

- [ ] **Step 7.1: Write the failing tests**

Create `studio/src/components/CdnBundlePreview.test.tsx`:

```tsx
// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// Same reason as BuiltBundlePreview.test.tsx: happy-dom would otherwise execute
// the srcdoc's inline script AND fetch + run the loader.js URL (real network /
// unhandled rejection). All assertions read the srcdoc *text*; the iframe's
// postMessage is simulated by hand.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { CdnBundlePreview, CDN_PREVIEW_ERROR_TYPE } from './CdnBundlePreview';

afterEach(cleanup);

function frameSrcdoc(container: HTMLElement): string {
  const frame = container.querySelector('iframe');
  expect(frame).toBeTruthy();
  expect(frame!.hasAttribute('sandbox')).toBe(false); // shared-origin localStorage is load-bearing
  return frame!.getAttribute('srcdoc') ?? '';
}

describe('CdnBundlePreview', () => {
  it('renders a srcdoc host page with the real loader and the serialized attrs', () => {
    const { container } = render(
      <CdnBundlePreview slug="sermons" overrides={{ perPage: 5 }} theme="dark" />,
    );
    const srcdoc = frameSrcdoc(container);
    expect(srcdoc).toContain('https://widgets.perimeter.org/loader.js');
    expect(srcdoc).toContain(
      '<div data-perimeter-widget="sermons" data-per-page="5" data-theme="dark"></div>',
    );
    expect(srcdoc).not.toContain('data-nowprocket'); // WP-Rocket hint is snippet-only
  });

  it('regenerates the srcdoc when overrides change', () => {
    const { container, rerender } = render(
      <CdnBundlePreview slug="sermons" overrides={{}} theme="light" />,
    );
    rerender(<CdnBundlePreview slug="sermons" overrides={{ perPage: 9 }} theme="light" />);
    expect(frameSrcdoc(container)).toContain('data-per-page="9"');
  });

  it('shows an error banner when the frame posts a failure', () => {
    const { container, getByRole } = render(
      <CdnBundlePreview slug="sermons" overrides={{}} theme="light" />,
    );
    // Deterministic, same pattern as BuiltBundlePreview.test.tsx — happy-dom's
    // real postMessage dispatches async outside act.
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: CDN_PREVIEW_ERROR_TYPE,
            slug: 'sermons',
            message: 'Failed to load loader.js',
          },
        }),
      );
    });
    expect(getByRole('alert').textContent).toContain('Failed to load');
    expect(container.querySelector('iframe')).toBeTruthy();
  });
});
```

- [ ] **Step 7.2: Run to verify failure**

```bash
pnpm --filter @perimeter/studio test src/components/CdnBundlePreview.test.tsx
```

- [ ] **Step 7.3: Implement**

Create `studio/src/components/CdnBundlePreview.tsx` (mirror `BuiltBundlePreview`'s error channel; JSON-encode script-context values exactly as it does):

```tsx
import { useEffect, useState } from 'react';
import { CDN_BASE_URL } from '../lib/catalog';
import { serializeWidgetAttrs, type PreviewTheme } from '../lib/embed-snippet';

/** postMessage type for srcdoc→parent failure reports (same-origin srcdoc). */
export const CDN_PREVIEW_ERROR_TYPE = 'perimeter-cdn-preview-error';

interface CdnPreviewErrorMessage {
  type: typeof CDN_PREVIEW_ERROR_TYPE;
  slug: string;
  message: string;
}

function isCdnPreviewError(data: unknown): data is CdnPreviewErrorMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === CDN_PREVIEW_ERROR_TYPE &&
    typeof (data as { slug?: unknown }).slug === 'string' &&
    typeof (data as { message?: unknown }).message === 'string'
  );
}

/**
 * The catalog's live embed: the SHIPPED production bundle, loaded through the
 * real loader.js → manifest.json → immutable-bundle chain, inside a same-origin
 * srcdoc iframe — exactly what a bare WordPress host page does, isolated from
 * studio React/CSS. Same failure channel as BuiltBundlePreview (a blank frame
 * must never fail silently). Prod-visible by design (BuiltBundlePreview stays
 * DEV-only). NEVER add `sandbox`: without allow-same-origin it forces an opaque
 * origin, localStorage throws, and MP sign-in can no longer reach the widget.
 */
export function CdnBundlePreview({
  slug,
  overrides,
  theme,
}: {
  slug: string;
  overrides: Record<string, unknown>;
  theme: PreviewTheme;
}) {
  const [error, setError] = useState<string | null>(null);

  // Any change that regenerates the srcdoc (slug, overrides, theme) gets a
  // fresh error slate — a stale banner over a healthy remount misleads.
  useEffect(() => {
    setError(null);
  }, [slug, overrides, theme]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (isCdnPreviewError(event.data) && event.data.slug === slug) {
        setError(event.data.message);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [slug]);

  const errorType = JSON.stringify(CDN_PREVIEW_ERROR_TYPE);
  const slugLiteral = JSON.stringify(slug);
  const loaderUrl = JSON.stringify(`${CDN_BASE_URL}/loader.js`);
  const srcDoc = [
    '<!doctype html><html><head><meta charset="utf-8">',
    '<style>html,body{margin:0;padding:0}</style>',
    '<script>',
    'function __report(message){',
    `try{parent.postMessage({type:${errorType},slug:${slugLiteral},message:String(message)},"*")}catch(e){}`,
    '}',
    'window.onerror=function(message,source,line,col,err){__report((err&&err.stack)||message);return false};',
    'window.addEventListener("unhandledrejection",function(e){__report("Unhandled rejection: "+((e.reason&&e.reason.message)||e.reason))});',
    '</script>',
    '</head><body>',
    // Div before the loader script (BuiltBundlePreview's proven order). The
    // copyable snippet is script-first per the docs — functionally equivalent
    // here since the loader scans + observes the whole document.
    `<div ${serializeWidgetAttrs(slug, overrides, theme)}></div>`,
    `<script src=${loaderUrl} async onerror="__report('Failed to load loader.js: '+this.src)"></script>`,
    '</body></html>',
  ].join('');

  return (
    <div className="relative min-h-[24rem] w-full">
      {error && (
        <div
          role="alert"
          className="absolute inset-x-0 top-0 z-10 space-y-1 bg-destructive px-4 py-3 text-left text-destructive-fg"
        >
          <p className="text-sm font-semibold">Shipped bundle failed to run</p>
          <p className="break-words text-xs">{error}</p>
        </div>
      )}
      <iframe
        title={`Live widget: ${slug}`}
        srcDoc={srcDoc}
        className="block h-[70vh] w-full border-0 bg-white"
      />
    </div>
  );
}
```

- [ ] **Step 7.4: Run to verify pass + commit**

```bash
pnpm --filter @perimeter/studio test src/components/CdnBundlePreview.test.tsx
git add studio/src/components/CdnBundlePreview.tsx studio/src/components/CdnBundlePreview.test.tsx
git commit -m "feat(studio): CdnBundlePreview — shipped-bundle srcdoc embed with error channel"
```

### Task 8: Viewer page composition (without the login panel)

**Files:**
- Modify: `studio/src/pages/CatalogWidgetPage.tsx`
- Test: `studio/src/pages/CatalogWidgetPage.test.tsx`
- Read first: `studio/src/pages/WidgetPage.tsx` (theme pattern), `studio/src/components/ConfigPanel.tsx`, `studio/src/components/Inspector.tsx` (copy-button pattern)

The login panel slot ships in Chunk 3; render a placeholder `null` for now so this task stays self-contained.

- [ ] **Step 8.1: Write the failing tests**

Create `studio/src/pages/CatalogWidgetPage.test.tsx`:

```tsx
// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// The page renders CdnBundlePreview, whose srcdoc carries scripts happy-dom
// would otherwise execute/fetch (see CdnBundlePreview.test.tsx). The stubbed
// fetch here has no text()/body surface, so script loading through it would
// throw; assertions never need the srcdoc to run.
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { CatalogWidgetPage } from './CatalogWidgetPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubManifest(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }),
  );
}

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/catalog/${slug}`]}>
      <Routes>
        <Route path="/catalog/:slug" element={<CatalogWidgetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CatalogWidgetPage', () => {
  it('shows skeletons while loading, then the live embed + snippet + docs link', async () => {
    stubManifest({ sermons: '1.4.2' });
    const { container } = renderAt('sermons');
    expect(container.querySelector('[data-testid="viewer-skeleton"]')).toBeTruthy();
    const ui = within(container);
    await ui.findByTitle('Live widget: sermons');
    // Snippet reflects the (empty) override set.
    expect(container.textContent).toContain('data-perimeter-widget="sermons"');
    expect(container.textContent).toContain('loader.js');
    const docsLink = ui.getByRole('link', { name: /widget docs/i });
    expect(docsLink.getAttribute('href')).toBe('/widgets/sermons');
  });

  it('renders NotFound for a slug that is not in the manifest', async () => {
    stubManifest({ sermons: '1.4.2' });
    const { container } = renderAt('event-finder');
    await within(container).findByText(/not found/i);
  });

  it('renders a reduced viewer (no playground) for a stale manifest entry', async () => {
    stubManifest({ ghost: '9.9.9' });
    const { container } = renderAt('ghost');
    const ui = within(container);
    await ui.findByTitle('Live widget: ghost');
    expect(container.querySelector('[data-testid="config-playground"]')).toBeNull();
  });
});
```

- [ ] **Step 8.2: Run to verify failure**

```bash
pnpm --filter @perimeter/studio test src/pages/CatalogWidgetPage.test.tsx
```

- [ ] **Step 8.3: Implement `CatalogWidgetPage`**

```tsx
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@perimeter/ui/button';
import { Card } from '@perimeter/ui/card';
import { Skeleton } from '@perimeter/ui/skeleton';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import { useCatalog, type CatalogEntry } from '../lib/catalog';
import { buildEmbedSnippet, type PreviewTheme } from '../lib/embed-snippet';
import { CdnBundlePreview } from '../components/CdnBundlePreview';
import { ConfigPanel } from '../components/ConfigPanel';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useChromeTheme } from '../lib/use-chrome-theme';
import { titleFromSlug } from '../lib/labels';
import { NotFoundPage } from './NotFoundPage';

/**
 * The catalog viewer: the SHIPPED bundle live (CdnBundlePreview), the config
 * playground, the copyable snippet (identical attribute set to the preview),
 * and the docs link. Sign-in panel (auth widgets) slots in above the embed.
 */
export function CatalogWidgetPage() {
  const { slug } = useParams();
  const { entries, isLoading, error, retry } = useCatalog();

  if (isLoading) {
    return (
      <div data-testid="viewer-skeleton" className="space-y-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[40vh] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="m-6 space-y-2 rounded-md border border-border bg-muted p-4">
        <p className="text-sm text-fg">Couldn&apos;t reach widgets.perimeter.org: {error}</p>
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) return <NotFoundPage />;
  return <ViewerView key={entry.slug} entry={entry} />;
}

function ViewerView({ entry }: { entry: CatalogEntry }) {
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  // Preview theme follows the studio chrome until pinned by the local toggle
  // (same pattern as WidgetPage); ephemeral by design (not URL-persisted).
  const [pinnedTheme, setPinnedTheme] = useState<PreviewTheme | null>(null);
  const chromeTheme = useChromeTheme();
  const theme: PreviewTheme = pinnedTheme ?? chromeTheme;
  const snippet = useMemo(
    () => buildEmbedSnippet(entry.slug, overrides, theme),
    [entry.slug, overrides, theme],
  );

  return (
    <div className="space-y-6 p-6">
      <header>
        <Breadcrumbs
          crumbs={[
            { label: 'Home', to: '/' },
            { label: 'Catalog', to: '/catalog' },
            { label: titleFromSlug(entry.slug) },
          ]}
        />
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-fg">
            {titleFromSlug(entry.slug)}
          </h1>
          <code className="text-xs text-muted-fg">v{entry.version}</code>
        </div>
        {entry.description && <p className="mt-1 text-sm text-muted-fg">{entry.description}</p>}
      </header>

      {/* Sign-in panel slot — Chunk 3 (MpLoginPanel) replaces this null. */}
      {null}

      <CdnBundlePreview slug={entry.slug} overrides={overrides} theme={theme} />

      {entry.definition && (
        <Card data-testid="config-playground" className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Options</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPinnedTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              Theme: {theme}
            </Button>
          </div>
          <ConfigPanel definition={entry.definition} overrides={overrides} onChange={setOverrides} />
        </Card>
      )}

      <SnippetBlock snippet={snippet} />

      {entry.definition && (
        <p className="text-sm text-muted-fg">
          <Link className="underline" to={`/widgets/${entry.slug}`}>
            Widget docs
          </Link>{' '}
          — usage, options reference, and design notes.
        </p>
      )}
    </div>
  );
}

function SnippetBlock({ snippet }: { snippet: string }) {
  const { copied, flash } = useCopiedFlash();
  const copy = () => {
    void navigator.clipboard?.writeText(snippet).then(flash);
  };
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">Embed snippet</h2>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-fg px-3 py-3 font-mono text-xs leading-relaxed text-bg">
        {snippet}
      </pre>
    </Card>
  );
}
```

Check `NotFoundPage`'s rendered text contains "not found" (case-insensitive) for the test's `findByText(/not found/i)`; adjust the assertion to the page's actual copy if different.

- [ ] **Step 8.4: Run to verify pass, full gate, manual check, commit**

```bash
pnpm --filter @perimeter/studio test
pnpm --filter @perimeter/studio typecheck
```

`pnpm dev` → `/catalog/sermons`: live shipped sermons renders in the frame (needs network); playground changes remount the frame and update the snippet; theme toggle works. Stop server.

```bash
git add -A && git commit -m "feat(studio): catalog viewer page — live embed, playground, snippet"
```

- [ ] **Step 8.5: Chunk 2 gate**

```bash
pnpm format && pnpm quality
```

Expected green; amend formatting deltas into the last commit if any.

---

## Chunk 3: MP login (popup page + panel), auth fixture, visual spec, external gates

### Task 9: `studio/public/mp-login.html`

**Files:**
- Create: `studio/public/mp-login.html` (also creates the `studio/public/` directory — Vite default `publicDir`, served at `/mp-login.html` in dev and copied into `dist/`; Vercel serves filesystem matches before SPA rewrites, so no rewrite change is needed)

This must be a **classic static page**: MPWidgets.js bootstraps only from `DOMContentLoaded` (no late-load fallback — verified against the live bundle), so the script tag is plain and blocking (never `async`/`defer`-less is fine, but NOT `async`), present in the initial HTML, with the required `id="MPWidgets"`.

- [ ] **Step 9.1: Create the file**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in — Perimeter</title>
    <style>
      body {
        margin: 0;
        display: grid;
        min-height: 100vh;
        place-items: center;
        background: #fafafa;
        color: #1f2937;
        font-family: ui-sans-serif, system-ui, sans-serif;
      }
      main {
        text-align: center;
        padding: 2rem;
      }
      h1 {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 1rem;
      }
      p {
        font-size: 0.875rem;
      }
      a {
        color: #2563eb;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Perimeter sign-in</h1>
      <mpp-user-login></mpp-user-login>
      <p id="mp-fallback" hidden>
        The sign-in widget couldn&rsquo;t load.
        <a href="https://www.perimeter.org/my-perimeter/">Sign in at perimeter.org</a> instead.
      </p>
      <p id="mp-done" hidden>You&rsquo;re signed in &mdash; you can close this window.</p>
    </main>
    <!-- The MP widget loader. MUST be a plain blocking script with this exact id:
         MPWidgets.js bootstraps exclusively from DOMContentLoaded (no readyState
         fallback) and resolves its app root from getElementById('MPWidgets').src.
         `async` would let DOMContentLoaded fire before evaluation — dead widget.
         Placed at the END of body (still evaluates before DOMContentLoaded) so
         the onerror fallback's #mp-fallback target is guaranteed to exist — in
         <head>, the error task can fire before the body is parsed. -->
    <script
      id="MPWidgets"
      src="https://ministryplatform.perimeter.org/widgets/dist/MPWidgets.js"
      onerror="document.getElementById('mp-fallback').hidden = false"
    ></script>
    <script>
      // After the OAuth round-trip MP redirects back here with ?cacheKey=<guid>;
      // MPWidgets exchanges it and writes mpp-widgets_AuthToken to localStorage.
      // Poll for the token (250ms, ~10s cap) and self-close; if the browser
      // refuses window.close(), show the "you can close this" line instead.
      (function () {
        if (!/[?&]cacheKey=/.test(window.location.search)) return;
        var tries = 0;
        var timer = setInterval(function () {
          tries += 1;
          var token = null;
          try {
            token = window.localStorage.getItem('mpp-widgets_AuthToken');
          } catch (e) {
            /* storage blocked — fall through to the cap */
          }
          if (token && token !== 'null') {
            clearInterval(timer);
            window.close();
            document.getElementById('mp-done').hidden = false;
          } else if (tries >= 40) {
            clearInterval(timer);
          }
        }, 250);
      })();
    </script>
  </body>
</html>
```

- [ ] **Step 9.2: Verify it serves in dev**

```bash
pnpm dev
```

Open `http://localhost:5173/mp-login.html` — the page loads; whether the login button renders depends on MP's CORS allowlist for localhost (Task 14); the fallback line must appear if you block the script in devtools. Stop server.

- [ ] **Step 9.3: Commit**

```bash
git add studio/public/mp-login.html
git commit -m "feat(studio): static MP login popup page"
```

### Task 10: `MpLoginPanel`

**Files:**
- Modify: `studio/package.json` (add `"@perimeter/auth": "workspace:*"` to dependencies, then `pnpm install`)
- Create: `studio/src/components/MpLoginPanel.tsx`
- Test: `studio/src/components/MpLoginPanel.test.tsx`

- [ ] **Step 10.1: Add the dependency**

```bash
pnpm --filter @perimeter/studio add '@perimeter/auth@workspace:*'
git add studio/package.json pnpm-lock.yaml
```

- [ ] **Step 10.2: Write the failing tests**

Create `studio/src/components/MpLoginPanel.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MpLoginPanel } from './MpLoginPanel';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function seedToken() {
  window.localStorage.setItem('mpp-widgets_AuthToken', 'tok');
  window.localStorage.setItem(
    'mpp-widgets_ExpiresAfter',
    new Date(Date.now() + 3_600_000).toISOString(),
  );
}

describe('MpLoginPanel', () => {
  it('signed out + required → prominent sign-in that opens the popup', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const { getByRole } = render(<MpLoginPanel mode="required" />);
    expect(getByRole('region').textContent).toMatch(/requires a signed-in perimeter account/i);
    getByRole('button', { name: /sign in/i }).click();
    expect(open).toHaveBeenCalledWith('/mp-login.html', 'perimeter-mp-login', expect.any(String));
  });

  it('popup blocked → inline new-tab link fallback', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { getByRole, findByRole } = render(<MpLoginPanel mode="required" />);
    getByRole('button', { name: /sign in/i }).click();
    const link = await findByRole('link', { name: /open the sign-in page/i });
    expect(link.getAttribute('href')).toBe('/mp-login.html');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('signed in → confirmation with a manage link, updating live from storage', async () => {
    const { getByRole, findByText } = render(<MpLoginPanel mode="required" />);
    expect(getByRole('region').textContent).toMatch(/sign in/i);
    seedToken(); // the panel's MPLocalStorageAuth poll picks this up
    await findByText(/signed in/i, undefined, { timeout: 3000 });
  });

  it('optional mode → compact personalization copy', () => {
    const { getByRole } = render(<MpLoginPanel mode="optional" />);
    expect(getByRole('region').textContent).toMatch(/personalized/i);
  });
});
```

- [ ] **Step 10.3: Run to verify failure**

```bash
pnpm --filter @perimeter/studio test src/components/MpLoginPanel.test.tsx
```

- [ ] **Step 10.4: Implement**

Create `studio/src/components/MpLoginPanel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { MPLocalStorageAuth } from '@perimeter/auth';
import { Button } from '@perimeter/ui/button';

/**
 * Viewer-page sign-in affordance for auth widgets. Reads the SAME localStorage
 * token (via MPLocalStorageAuth) the embedded widgets poll, so the panel and
 * the widgets can never disagree — including expiry, where both flip to
 * signed-out together. Sign-in itself happens on /mp-login.html (a classic
 * page hosting the MP login widget; see the spec — MPWidgets cannot run in
 * the SPA), opened as a popup so the token lands in this origin's storage.
 */
export function MpLoginPanel({ mode }: { mode: 'required' | 'optional' }) {
  const [authed, setAuthed] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // The reader is created AND disposed inside the effect: the studio renders
  // under StrictMode, whose dev double-effect would otherwise dispose a
  // memoized instance once and resubscribe to a dead reader (no storage
  // listener, no poll) — the panel would never flip after sign-in.
  useEffect(() => {
    const auth = new MPLocalStorageAuth();
    setAuthed(auth.isAuthenticated());
    const off = auth.onChange(() => setAuthed(auth.isAuthenticated()));
    return () => {
      off();
      auth.dispose();
    };
  }, []);

  const openPopup = () => {
    const popup = window.open('/mp-login.html', 'perimeter-mp-login', 'width=480,height=640');
    if (!popup) setBlocked(true);
  };

  if (authed) {
    return (
      <section
        role="region"
        aria-label="Sign-in status"
        className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted px-4 py-2"
      >
        <p className="text-sm text-fg">Signed in — this widget is showing your live data.</p>
        <Button type="button" variant="outline" size="sm" onClick={openPopup}>
          Manage sign-in
        </Button>
      </section>
    );
  }

  const prominent = mode === 'required';
  return (
    <section
      role="region"
      aria-label="Sign-in status"
      className={
        prominent
          ? 'space-y-2 rounded-md border border-border bg-muted p-4'
          : 'flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2'
      }
    >
      <p className={prominent ? 'text-sm font-medium text-fg' : 'text-sm text-muted-fg'}>
        {prominent
          ? 'This widget requires a signed-in Perimeter account.'
          : 'Sign in to see personalized data.'}
      </p>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={openPopup}>
          Sign in
        </Button>
        {blocked && (
          <a
            className="text-sm underline"
            href="/mp-login.html"
            target="_blank"
            rel="noreferrer"
          >
            Open the sign-in page
          </a>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 10.5: Wire it into the viewer** — in `CatalogWidgetPage.tsx`'s `ViewerView`, replace the `{null}` slot:

```tsx
      {entry.definition && entry.definition.auth !== 'none' && (
        <MpLoginPanel mode={entry.definition.auth} />
      )}
```

(with the import added). Extend `CatalogWidgetPage.test.tsx` with two cases:

```tsx
  it('shows the sign-in panel for an auth-required widget', async () => {
    stubManifest({ 'my-shepherds': '0.1.0' });
    const { container } = renderAt('my-shepherds');
    const ui = within(container);
    const region = await ui.findByRole('region', { name: /sign-in status/i });
    expect(region.textContent).toMatch(/requires a signed-in perimeter account/i);
  });

  it('shows no sign-in panel for an anonymous widget', async () => {
    stubManifest({ sermons: '1.4.2' });
    const { container } = renderAt('sermons');
    await within(container).findByTitle('Live widget: sermons');
    expect(within(container).queryByRole('region', { name: /sign-in status/i })).toBeNull();
  });
```

- [ ] **Step 10.6: Run all studio tests + commit**

```bash
pnpm --filter @perimeter/studio test && pnpm --filter @perimeter/studio typecheck
git add -A && git commit -m "feat(studio): MP sign-in panel wired into the catalog viewer"
```

### Task 11: `packages/auth` ExpiresAfter fixture

**Files:**
- Modify: `packages/auth/tests/mp-local-storage-auth.test.ts`

MPWidgets writes `ExpiresAfter` via `String(new Date(...))` — the **native `Date.prototype.toString()` format** (e.g. `"Wed Jul 09 2026 12:00:00 GMT-0400 (Eastern Daylight Time)"`), not ISO. `getToken()` already falls back to `Date.parse` (`packages/auth/src/mp-local-storage-auth.ts:48`), which accepts this format in all engines we target — pin it with a test so it can never silently regress. **No source change.**

- [ ] **Step 11.1: Read the existing test file** to match its setup helpers, then add:

```ts
  it('accepts MPWidgets’ native Date.toString() ExpiresAfter format', () => {
    const future = new Date(Date.now() + 3_600_000).toString(); // e.g. "Wed Jul 09 2026 …"
    localStorage.setItem('mpp-widgets_AuthToken', 'tok');
    localStorage.setItem('mpp-widgets_ExpiresAfter', future);
    const auth = new MPLocalStorageAuth({ pollIntervalMs: 0 });
    expect(auth.getToken()).toBe('tok');
    auth.dispose();
  });

  it('treats an expired native-format ExpiresAfter as signed out', () => {
    const past = new Date(Date.now() - 3_600_000).toString();
    localStorage.setItem('mpp-widgets_AuthToken', 'tok');
    localStorage.setItem('mpp-widgets_ExpiresAfter', past);
    const auth = new MPLocalStorageAuth({ pollIntervalMs: 0 });
    expect(auth.getToken()).toBeNull();
    auth.dispose();
  });
```

(Adapt constructor/cleanup details to the file's existing conventions.)

- [ ] **Step 11.2: Run + commit**

```bash
pnpm --filter @perimeter/auth test
git add packages/auth/tests/mp-local-storage-auth.test.ts
git commit -m "test(auth): pin MPWidgets native Date.toString ExpiresAfter format"
```

### Task 12: Hermetic Playwright visual spec

**Files:**
- Create: `studio/visual/catalog.spec.ts`
- Modify: `studio/visual/helpers.ts` (add `mockCdn`)
- Read first: `studio/visual/helpers.ts`, `studio/visual/a11y-sweep.spec.ts` (conventions: route mocks before goto, axe usage), `studio/visual/screenshot-baselines.spec.ts` (absolute `maxDiffPixels`, never a ratio)

Hermetic rule: intercept **every** widgets.perimeter.org request — fixture manifest (pinned fake versions so card text never churns with releases), loader.js + bundles served from the **committed local `cdn/` files**. perimeter-api is mocked with the existing `mockSermonsApi`. The MP popup is never opened (assert the panel only), so MPWidgets.js is never fetched.

- [ ] **Step 12.1: Add `mockCdn` to `studio/visual/helpers.ts`**

```ts
// Merge into helpers.ts's existing `import { mkdirSync } from 'node:fs'` line:
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// studio is `"type": "module"` — Playwright loads this file as ESM, so
// `__dirname` does not exist (it would kill the WHOLE visual suite at load).
const CDN_DIR = fileURLToPath(new URL('../../cdn', import.meta.url));

/**
 * Serve the CDN hermetically from the committed cdn/ directory: a PINNED
 * fixture manifest (fake versions — card text never churns with releases)
 * with loader.js and each bundle read from disk. Register before page.goto.
 */
export async function mockCdn(page: Page): Promise<void> {
  const realManifest = JSON.parse(readFileSync(path.join(CDN_DIR, 'manifest.json'), 'utf8')) as
    Record<string, string>;
  const fixtureManifest = { sermons: '9.9.9', 'my-shepherds': '9.9.8' };
  await page.route('https://widgets.perimeter.org/**', async (route: Route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/manifest.json') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureManifest) });
    }
    if (pathname === '/loader.js') {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(path.join(CDN_DIR, 'loader.js'), 'utf8') });
    }
    // /<slug>/9.9.x/index.js → serve the committed current bundle for that slug.
    const match = /^\/([^/]+)\/[^/]+\/index\.js$/.exec(pathname);
    if (match) {
      const slug = match[1]!;
      const version = realManifest[slug];
      if (version) {
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(path.join(CDN_DIR, slug, version, 'index.js'), 'utf8') });
      }
    }
    return route.fulfill({ status: 404, body: 'not mocked' });
  });
}
```

- [ ] **Step 12.2: Write `studio/visual/catalog.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { STUDIO_URL, mockCdn, mockSermonsApi } from './helpers';

test.describe('catalog', () => {
  test('landing lists released widgets with auth badges (axe clean)', async ({ page }) => {
    await mockCdn(page);
    await page.goto(`${STUDIO_URL}/catalog`);
    await expect(page.getByRole('link', { name: /sermons/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /my shepherds/i })).toBeVisible();
    await expect(page.getByText('Sign-in required')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    // The pinned fixture manifest (9.9.9/9.9.8) exists exactly so this baseline
    // never churns with releases. Absolute maxDiffPixels per repo convention.
    await expect(page).toHaveScreenshot('catalog-landing.png', { maxDiffPixels: 100 });
  });

  test('viewer runs the shipped sermons bundle hermetically', async ({ page }) => {
    await mockCdn(page);
    await mockSermonsApi(page);
    await page.goto(`${STUDIO_URL}/catalog/sermons`);
    // Snippet present with the loader form.
    await expect(page.getByText('data-perimeter-widget="sermons"').first()).toBeVisible();
    // The shipped bundle actually MOUNTED and rendered fixture data: Playwright
    // pierces the open shadow root (mount.tsx uses { mode: 'open' }), so assert
    // real content — a sermon title from studio/visual/fixtures/sermons.ts
    // (open the fixture and use an exact title string from it).
    const frame = page.frameLocator('iframe[title="Live widget: sermons"]');
    await expect(frame.getByText('<a sermon title from the fixture>')).toBeVisible();
  });

  test('auth viewer shows the sign-in panel and the embedded gate', async ({ page }) => {
    await mockCdn(page);
    await page.goto(`${STUDIO_URL}/catalog/my-shepherds`);
    await expect(page.getByRole('region', { name: /sign-in status/i })).toBeVisible();
    const frame = page.frameLocator('iframe[title="Live widget: my-shepherds"]');
    await expect(frame.getByText(/please sign in/i)).toBeVisible();
  });
});
```

Note: the my-shepherds assertion exercises the real shipped bundle's `AuthGate` ("Please sign in to use this widget.") with no token in localStorage — deterministic and network-free. The sermons widget makes API calls the `mockSermonsApi` fixtures satisfy. If the sermons bundle requests routes the fixture set doesn't cover, extend `mockSermonsApi` fixtures rather than loosening assertions.

- [ ] **Step 12.3: Run the visual suite** (needs Playwright browsers; `studio/playwright.config.ts` self-starts the dev server with `reuseExistingServer: true`, so an already-running `pnpm dev` on 5173 is simply reused):

```bash
pnpm --filter @perimeter/studio visual -- catalog.spec.ts --update-snapshots
pnpm --filter @perimeter/studio visual -- catalog.spec.ts
```

First run generates the `catalog-landing.png` baseline (commit it — baselines are per-platform and committed); second run must be 3 PASS against it. Fix fixture gaps if the frame stays empty (check the spec's network log — every widgets.perimeter.org URL must be fulfilled by `mockCdn`). Also reconcile the pre-existing screenshot baselines the new sidebar Catalog group invalidated (`screenshot-baselines.spec.ts`): run the full suite, review the diffs are nav-only, and update them:

```bash
pnpm --filter @perimeter/studio visual
# review failures: only the sidebar group diff is expected
pnpm --filter @perimeter/studio visual -- --update-snapshots
pnpm --filter @perimeter/studio visual
```

- [ ] **Step 12.4: Commit**

```bash
git add studio/visual/catalog.spec.ts studio/visual/helpers.ts
git commit -m "test(studio): hermetic catalog visual spec (fixture manifest, local cdn files)"
```

### Task 13: Full gate + PR

- [ ] **Step 13.1:**

```bash
pnpm format
pnpm quality
```

Expected: green. If turbo replays cached tests, re-run with `--force` to be sure the gate actually executed (local cache can mask test runs).

- [ ] **Step 13.2: Push and open the PR** (body via `--body-file`, never inline):

```bash
git push -u origin feat/widget-catalog
```

Write the PR body to a temp file with the Write tool (summary: catalog section, shipped-bundle viewer, MP login popup, frontmatter pipeline; note the two MP-side gates from Task 14 as merge-independent but e2e-blocking), then:

```bash
gh pr create --base dev --title "feat(studio): widget catalog + MP login viewer pages" --body-file <path>
```

### Task 14: External-assumption validation (manual; owner/MP-admin involvement)

These do not block the PR (Chunks 1–2 and all unit tests are hermetic), but the login feature is not DONE until both pass on a deployed origin. Record results in the PR.

- [ ] **Step 14.1: CORS allowlist.** From the deployed style.perimeter.org (or a preview deploy), open `/mp-login.html` with devtools → Network. The page's requests to `ministryplatform.perimeter.org/widgets/*` (GetAuthConfiguration, CSRFToken) must succeed (no CORS errors) and the login button must render. If they fail: MP admin must add style.perimeter.org (and optionally localhost:5173) to the widgets CORS/origin allowlist — the same configuration perimeter.org already has.
- [ ] **Step 14.2: OAuth return.** Click Login in the popup, complete MP sign-in, and confirm: the popup returns to `/mp-login.html?cacheKey=…`, the token appears in localStorage (`mpp-widgets_AuthToken` under the style.perimeter.org origin), and the popup self-closes.
- [ ] **Step 14.3: End-to-end smoke.** On `/catalog/my-shepherds`: sign in via the panel → the shipped bundle unlocks and renders live data; `?cacheKey` never appears in the viewer URL; copy the snippet onto an embed-lab page (`pnpm embed-lab`) and confirm it matches the rendered embed.
- [ ] **Step 14.4:** If style.perimeter.org itself is not deployed yet, that setup is the existing owner runbook `docs/deploying-studio.md` — flag it in the PR rather than blocking on it.

---

## Post-merge notes

- The catalog auto-appears for future widgets on release (manifest-driven); the only per-widget authoring is `description:` frontmatter in its doc.
- Rollback story: the feature is additive UI in the studio; reverting the PR removes it. No cdn/, loader, or runtime surface changed.
