import example from '@perimeter/widget-example';
import type { WidgetDefinition } from '@perimeter/widget-runtime';

export const widgetDefinitions: Record<string, WidgetDefinition> = {
  example: example as unknown as WidgetDefinition,
};
