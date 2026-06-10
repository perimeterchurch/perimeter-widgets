import type { z } from 'zod';
import type { WidgetDefinition } from './define-widget';
import { mount, type MountedWidget } from './mount';

const MARKER = 'data-perimeter-widget';
const MOUNTED = '__perimeterMounted';

type ObserverHandle = { observer: MutationObserver };
const observers = new Map<string, ObserverHandle>();
// Live handles per auto-mounted element, so SPA removals can dispose them.
const mountedHandles = new Map<HTMLElement, MountedWidget>();

function mountIfMatch<S extends z.ZodTypeAny>(
  def: WidgetDefinition<S>,
  css: string,
  el: Element,
): void {
  if (!(el instanceof HTMLElement)) return;
  if (el.getAttribute(MARKER) !== def.name) return;
  const node = el as HTMLElement & { [MOUNTED]?: boolean };
  if (node[MOUNTED]) return;
  // mount() throws synchronously on invalid data-* config (the zod parse runs
  // before React, so the ErrorBoundary never sees it). One bad embed must not
  // abort its siblings' forEach/observer batch, and the node must stay
  // remountable once the attribute is fixed — so the mounted flag is set only
  // after a successful mount.
  try {
    const handle = mount(el, def, css);
    node[MOUNTED] = true;
    mountedHandles.set(node, handle);
  } catch (error) {
    console.error(`[perimeter-widgets] failed to mount "${def.name}":`, error);
    // The shadow root is only attached after config parsing succeeds, so a
    // light-DOM message is visible now and hidden automatically by a later
    // successful mount.
    el.textContent = `[perimeter-widgets] invalid ${def.name} embed config — see console`;
  }
}

function unmountIfTracked(el: Element): void {
  if (!(el instanceof HTMLElement)) return;
  const handle = mountedHandles.get(el);
  if (!handle) return;
  handle.unmount();
  mountedHandles.delete(el);
  // Allow a re-added node (SPA route revisit, drag-and-drop move) to remount.
  (el as HTMLElement & { [MOUNTED]?: boolean })[MOUNTED] = false;
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
      // Dispose instances whose host left the DOM (SPA navigation) — without
      // this, the detached React tree, query client, and the auth provider's
      // 1s localStorage poll leak per removed embed.
      m.removedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          unmountIfTracked(node);
          node
            .querySelectorAll<HTMLElement>(`[${MARKER}="${def.name}"]`)
            .forEach((el) => unmountIfTracked(el));
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
  for (const handle of mountedHandles.values()) handle.unmount();
  mountedHandles.clear();
}
