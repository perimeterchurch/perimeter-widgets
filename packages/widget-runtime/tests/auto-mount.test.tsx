// packages/widget-runtime/tests/auto-mount.test.tsx
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { autoMount, disposeAutoMount } from '../src/auto-mount';
import { clearStyleCache } from '../src/styling';
import { getInstances } from '../src/registry';

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

describe('autoMount error isolation (audit #26)', () => {
  const strictWidget = defineWidget({
    name: 'am-strict',
    auth: 'none',
    schema: z.object({ count: z.coerce.number().int().min(1).default(1) }),
    App: () => <span data-testid="am">ok</span>,
  });

  it('one invalid embed does not abort mounting of its siblings', async () => {
    const bad = document.createElement('div');
    bad.setAttribute('data-perimeter-widget', 'am-strict');
    bad.setAttribute('data-count', 'abc'); // NaN → schema.parse throws
    document.body.appendChild(bad);

    const good = document.createElement('div');
    good.setAttribute('data-perimeter-widget', 'am-strict');
    document.body.appendChild(good);

    autoMount(strictWidget, '.x{}');

    // The good sibling (later in document order) still mounts…
    expect(await waitForRender(good)).toBeTruthy();
    // …and the bad embed fails visibly instead of as a blank div.
    expect(bad.shadowRoot).toBeNull();
    expect(bad.textContent).toContain('invalid am-strict embed config');
  });

  it('a failed embed is not poisoned — it mounts once the config is fixed', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-perimeter-widget', 'am-strict');
    el.setAttribute('data-count', 'abc');
    document.body.appendChild(el);

    autoMount(strictWidget, '.x{}');
    expect(el.shadowRoot).toBeNull();

    el.setAttribute('data-count', '3');
    autoMount(strictWidget, '.x{}'); // re-scan (same path a fixing script would trigger)
    expect(await waitForRender(el)).toBeTruthy();
  });
});

describe('autoMount removal disposal (audit #27)', () => {
  it('disposes the instance when its host leaves the DOM, and remounts on re-add', async () => {
    const el = document.createElement('div');
    el.setAttribute('data-perimeter-widget', 'am-test');
    document.body.appendChild(el);

    autoMount(widget, '.x{}');
    expect(await waitForRender(el)).toBeTruthy();
    expect(getInstances('am-test')).toHaveLength(1);

    el.remove();
    // Let the MutationObserver process the removal.
    await new Promise((r) => setTimeout(r, 0));
    expect(getInstances('am-test')).toHaveLength(0);

    document.body.appendChild(el);
    expect(await waitForRender(el)).toBeTruthy();
    expect(getInstances('am-test')).toHaveLength(1);
  });
});
