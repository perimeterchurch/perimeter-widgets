import { useCallback, useEffect, useState } from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { toWidgetEntries, widgetDefGlob, widgetCssGlob } from './discovery';
import { widgetDescription } from './widget-docs';

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
