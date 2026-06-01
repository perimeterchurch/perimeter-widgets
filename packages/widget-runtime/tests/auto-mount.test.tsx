// packages/widget-runtime/tests/auto-mount.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { autoMount, disposeAutoMount } from '../src/auto-mount';
import { clearStyleCache } from '../src/styling';

const widget = defineWidget({
  name: 'am-test',
  auth: 'none',
  schema: z.object({}),
  App: () => <span data-testid="am">ok</span>,
});

beforeEach(() => clearStyleCache());
afterEach(() => {
  disposeAutoMount();
  document.body.innerHTML = '';
});

// Wait for the MutationObserver to fire and React (async under happy-dom) to render.
async function waitForRender(el: HTMLElement): Promise<Element | null> {
  for (let i = 0; i < 20; i++) {
    const found = el.shadowRoot?.querySelector('[data-testid="am"]') ?? null;
    if (found) return found;
    await new Promise((r) => setTimeout(r, 0));
  }
  return el.shadowRoot?.querySelector('[data-testid="am"]') ?? null;
}

describe('autoMount(definition, css)', () => {
  it('mounts existing targets and dynamically-added targets', async () => {
    const a = document.createElement('div');
    a.setAttribute('data-perimeter-widget', 'am-test');
    document.body.appendChild(a);

    autoMount(widget, '.x{}');
    expect(await waitForRender(a)).toBeTruthy();

    const b = document.createElement('div');
    b.setAttribute('data-perimeter-widget', 'am-test');
    document.body.appendChild(b);
    expect(await waitForRender(b)).toBeTruthy(); // observer fires, then React renders
  });
});
