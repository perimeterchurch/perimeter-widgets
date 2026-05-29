import type { z } from 'zod';
import type { ThemeToken } from '@perimeter/theme';
import type { WidgetDefinition } from './define-widget';
import { getInstances } from './registry';
import { mountWidget, type MountedWidget } from './mount';

export interface PerimeterWidgetsGlobal {
  /** Map of registered widget definitions, keyed by name. */
  widgets: Record<string, WidgetDefinition>;
  /** Re-resolve theme tokens for all live instances of `name` using the given overrides. */
  applyOverrides(name: string, overrides: Partial<Record<ThemeToken, string>>): void;
  /** Manual mount escape hatch. Returns the live MountedWidget. */
  mount(
    name: string,
    target: HTMLElement,
    configOverrides?: Record<string, unknown>,
  ): MountedWidget;
}

declare global {
  interface Window {
    PerimeterWidgets: PerimeterWidgetsGlobal;
  }
}

function getOrCreate(): PerimeterWidgetsGlobal {
  const existing = (window as { PerimeterWidgets?: PerimeterWidgetsGlobal }).PerimeterWidgets;
  if (existing) return existing;
  const fresh: PerimeterWidgetsGlobal = {
    widgets: {},
    applyOverrides(name, overrides) {
      for (const handle of getInstances(name)) {
        handle.updateTokens(overrides);
      }
    },
    mount(name, target, configOverrides) {
      const def = fresh.widgets[name];
      if (!def) throw new Error(`No widget registered with name "${name}"`);
      return mountWidget({ definition: def, target, configOverrides });
    },
  };
  window.PerimeterWidgets = fresh;
  return fresh;
}

export function ensureGlobal<S extends z.ZodTypeAny>(def: WidgetDefinition<S>): void {
  const g = getOrCreate();
  // The widgets map erases S — each entry's actual schema is opaque from the outside;
  // mount() invokes mountWidget which only needs to read .schema/.App at runtime.
  g.widgets[def.name] = def as unknown as WidgetDefinition;
}
