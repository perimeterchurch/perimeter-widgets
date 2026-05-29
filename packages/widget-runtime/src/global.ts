import type { z } from 'zod';
import type { ThemeToken } from '@perimeter/theme';
import type { WidgetDefinition } from './define-widget';
import { getInstances } from './registry';
import { mount, type MountedWidget } from './mount';

interface RegisteredWidget {
  definition: WidgetDefinition;
  css: string;
}

export interface PerimeterWidgetsGlobal {
  widgets: Record<string, RegisteredWidget>;
  applyOverrides(name: string, overrides: Partial<Record<ThemeToken, string>>): void;
  mount(name: string, target: HTMLElement, configOverrides?: Record<string, unknown>): MountedWidget;
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
      for (const handle of getInstances(name)) handle.updateTokens(overrides);
    },
    mount(name, target, configOverrides) {
      const entry = fresh.widgets[name];
      if (!entry) throw new Error(`No widget registered with name "${name}"`);
      return mount(target, entry.definition, entry.css, { configOverrides });
    },
  };
  window.PerimeterWidgets = fresh;
  return fresh;
}

export function ensureGlobal<S extends z.ZodTypeAny>(def: WidgetDefinition<S>, css: string): void {
  const g = getOrCreate();
  g.widgets[def.name] = { definition: def as unknown as WidgetDefinition, css };
}
