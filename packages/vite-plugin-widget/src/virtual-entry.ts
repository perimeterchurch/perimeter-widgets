export interface BuildVirtualEntryArgs {
  entryId: string;
  version: string;
}

export const VIRTUAL_ENTRY_ID = '\0perimeter-widget-entry';

/**
 * Sentinel string the plugin replaces at generateBundle time with the
 * processed CSS content (Tailwind + user CSS) for this widget.
 */
export const CSS_PLACEHOLDER = '__PERIMETER_WIDGET_CSS_$$_PLACEHOLDER_$$__';

export function buildVirtualEntry({ entryId, version }: BuildVirtualEntryArgs): string {
  return [
    `import definition from ${JSON.stringify(entryId)};`,
    `import { autoMount, ensureGlobal, registerCss } from '@perimeter/widget-runtime';`,
    ``,
    `const widgetCss = ${JSON.stringify(CSS_PLACEHOLDER)};`,
    `const def = { ...definition, version: ${JSON.stringify(version)} };`,
    `registerCss(def.name, widgetCss);`,
    `ensureGlobal(def);`,
    `autoMount(def);`,
    ``,
  ].join('\n');
}
