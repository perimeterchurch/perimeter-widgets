import type * as React from 'react';
import type { z } from 'zod';
import type { AuthProvider } from '@perimeter/auth';
import type { ThemeToken } from '@perimeter/theme';

export type AuthMode = 'required' | 'optional' | 'none';

export interface DefineWidgetOptions<S extends z.ZodTypeAny> {
  name: string;
  auth: AuthMode;
  schema: S;
  themeOverrides?: Partial<Record<ThemeToken, string>> | undefined;
  /**
   * Human-readable names for config fields, keyed by schema key, for the tools
   * that present them — the studio's Configure panel and schema reference.
   *
   * Purely presentational: the `data-*` attribute an embed writes is always
   * derived from the SCHEMA KEY, so a label can be reworded freely without
   * touching a single live page. Fields with no entry fall back to a humanized
   * form of the key.
   *
   * Worth setting wherever the key is jargon. `detailsMode` and `detailLayout`
   * read as near-synonyms in a list but do unrelated things, which is exactly
   * the confusion a label fixes.
   */
  configLabels?: Partial<Record<keyof z.infer<S> & string, string>> | undefined;
  App: React.ComponentType<{ config: z.infer<S>; auth: AuthProvider }>;
}

export interface WidgetDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  auth: AuthMode;
  schema: S;
  themeOverrides?: Partial<Record<ThemeToken, string>> | undefined;
  /** See `DefineWidgetOptions.configLabels`. */
  configLabels?: Partial<Record<keyof z.infer<S> & string, string>> | undefined;
  App: React.ComponentType<{ config: z.infer<S>; auth: AuthProvider }>;
  /** Populated by the vite plugin at build time from package.json. */
  version?: string | undefined;
}

export function defineWidget<S extends z.ZodTypeAny>(
  opts: DefineWidgetOptions<S>,
): WidgetDefinition<S> {
  return { ...opts };
}
