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

const tick = () => new Promise((r) => setTimeout(r, 0));

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
    await tick();
    expect(host.shadowRoot!.querySelector('[data-testid="x"]')).toBeTruthy();
    handle.unmount();
  });

  it('throws for an unregistered widget name', () => {
    ensureGlobal(def, ':host{}');
    const host = document.createElement('div');
    expect(() => window.PerimeterWidgets.mount('nope', host)).toThrow();
  });
});
