'use client';
import * as React from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { nativeRender, registerCss } from '@perimeter/widget-runtime';
import { useThemeOverrides } from '../theme-overrides-context';

export interface NativeRendererProps {
  definition: WidgetDefinition;
  config: Record<string, string>;
  dataThemeAttrs: Record<string, string>;
}

export function NativeRenderer({
  definition,
  config,
  dataThemeAttrs,
}: NativeRendererProps): React.JSX.Element {
  const host = React.useRef<HTMLDivElement | null>(null);
  const target = React.useRef<HTMLDivElement | null>(null);
  const mounted = React.useRef<ReturnType<typeof nativeRender> | null>(null);
  const { overrides } = useThemeOverrides();
  const configKey = React.useMemo(() => JSON.stringify(config), [config]);
  const themeKey = React.useMemo(() => JSON.stringify(dataThemeAttrs), [dataThemeAttrs]);

  React.useEffect(() => {
    // Native mode: no IIFE involved, so register an empty CSS string for this widget
    // (Tailwind classes resolve via :root vars).
    registerCss(definition.name, '');
  }, [definition.name]);

  React.useEffect(() => {
    const t = target.current;
    const h = host.current;
    if (!t || !h) return;
    for (const [k, v] of Object.entries(dataThemeAttrs)) t.setAttribute(k, v);
    for (const [k, v] of Object.entries(config)) t.setAttribute(`data-${k}`, v);
    mounted.current = nativeRender({
      definition,
      target: t,
      hostRoot: h,
      authFactory: () => ({
        getToken: () => null,
        isAuthenticated: () => false,
        onChange: () => () => {},
      }),
    });
    return () => {
      mounted.current?.unmount();
      mounted.current = null;
    };
    // configKey/themeKey are memoized scalars derived from config/dataThemeAttrs above.
  }, [definition, configKey, themeKey]);

  React.useEffect(() => {
    mounted.current?.updateTokens(overrides);
  }, [overrides]);

  return (
    <div ref={host}>
      <div ref={target} />
    </div>
  );
}
