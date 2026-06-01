import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { ensureGlobal } from '../src/global';
import { clearAll } from '../src/registry';
import { clearStyleCache } from '../src/styling';

const def = defineWidget({
  name: 'g-test',
  auth: 'none',
  schema: z.object({}),
  App: () => <div data-testid="x">ok</div>,
});

// React commits asynchronously under happy-dom; poll instead of a single tick
// (a single setTimeout(0) is flaky in CI).
async function waitForEl(root: ShadowRoot, selector: string): Promise<Element | null> {
  for (let i = 0; i < 20; i++) {
    const found = root.querySelector(selector);
    if (found) return found;
    await new Promise((r) => setTimeout(r, 0));
  }
  return root.querySelector(selector);
}

describe('window.PerimeterWidgets', () => {
  beforeEach(() => {
    clearAll();
    clearStyleCache();
    (window as unknown as { PerimeterWidgets?: unknown }).PerimeterWidgets = undefined;
    document.body.innerHTML = '';
  });

  it('registers a widget with its css and mounts via the global escape hatch', async () => {
    ensureGlobal(def, ':host{}');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = window.PerimeterWidgets.mount('g-test', host);
    const el = await waitForEl(host.shadowRoot!, '[data-testid="x"]');
    expect(el).toBeTruthy();
    handle.unmount();
  });

  it('throws for an unregistered widget name', () => {
    ensureGlobal(def, ':host{}');
    const host = document.createElement('div');
    expect(() => window.PerimeterWidgets.mount('nope', host)).toThrow();
  });
});
