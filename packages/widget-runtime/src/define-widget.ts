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
  App: React.ComponentType<{ config: z.infer<S>; auth: AuthProvider }>;
}

export interface WidgetDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  auth: AuthMode;
  schema: S;
  themeOverrides?: Partial<Record<ThemeToken, string>> | undefined;
  App: React.ComponentType<{ config: z.infer<S>; auth: AuthProvider }>;
  /** Populated by the vite plugin at build time from package.json. */
  version?: string | undefined;
}

export function defineWidget<S extends z.ZodTypeAny>(
  opts: DefineWidgetOptions<S>,
): WidgetDefinition<S> {
  return { ...opts };
}
