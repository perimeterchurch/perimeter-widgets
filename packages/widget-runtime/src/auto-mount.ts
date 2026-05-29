import type { z } from 'zod';
import type { WidgetDefinition } from './define-widget';
import { mount } from './mount';

const MARKER = 'data-perimeter-widget';
const MOUNTED = '__perimeterMounted';

type ObserverHandle = { observer: MutationObserver };
const observers = new Map<string, ObserverHandle>();

function mountIfMatch<S extends z.ZodTypeAny>(
  def: WidgetDefinition<S>,
  css: string,
  el: Element,
): void {
  if (!(el instanceof HTMLElement)) return;
  if (el.getAttribute(MARKER) !== def.name) return;
  const node = el as HTMLElement & { [MOUNTED]?: boolean };
  if (node[MOUNTED]) return;
  node[MOUNTED] = true;
  mount(el, def, css);
}

export function autoMount<S extends z.ZodTypeAny>(def: WidgetDefinition<S>, css: string): void {
  document
    .querySelectorAll<HTMLElement>(`[${MARKER}="${def.name}"]`)
    .forEach((el) => mountIfMatch(def, css, el));

  if (observers.has(def.name)) return;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          mountIfMatch(def, css, node);
          node
            .querySelectorAll<HTMLElement>(`[${MARKER}="${def.name}"]`)
            .forEach((el) => mountIfMatch(def, css, el));
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  observers.set(def.name, { observer });
}

export function disposeAutoMount(): void {
  for (const { observer } of observers.values()) observer.disconnect();
  observers.clear();
}
