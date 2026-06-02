// packages/widget-runtime/tests/mount.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { mount } from '../src/mount';
import { countAppliedSheets, clearStyleCache } from '../src/styling';

beforeEach(() => clearStyleCache());

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

const widget = defineWidget({
  name: 'm-test',
  auth: 'none',
  schema: z.object({ label: z.string().default('hi') }),
  App: ({ config }) => <p data-testid="lbl">{config.label}</p>,
});

const CSS = '.box{color:rgb(1,2,3)}';

describe('mount', () => {
  it('attaches a shadow root and renders the App with parsed config', async () => {
    const host = document.createElement('div');
    host.setAttribute('data-label', 'world');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    const root = host.shadowRoot!;
    expect(root).toBeTruthy();
    const el = await waitForEl(root, '[data-testid="lbl"]');
    expect(el?.textContent).toBe('world');
    handle.unmount();
  });

  it('applies a widget layer + token layer into the shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    expect(countAppliedSheets(host.shadowRoot!)).toBe(2);
    handle.unmount();
  });

  it('updateTokens keeps the shared widget layer and refreshes the token layer', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    const widgetLayerBefore = host.shadowRoot!.adoptedStyleSheets[0];
    handle.updateTokens({ 'color-primary': 'hsl(0 0% 0%)' });
    expect(host.shadowRoot!.adoptedStyleSheets[0]).toBe(widgetLayerBefore);
    expect(countAppliedSheets(host.shadowRoot!)).toBe(2);
    handle.unmount();
  });

  it('unmount removes all applied styles', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, widget, CSS);
    handle.unmount();
    expect(countAppliedSheets(host.shadowRoot!)).toBe(0);
  });
});

describe('mount config re-validation (studio configOverrides parity with prod data-* gate)', () => {
  it('coerces string configOverrides through the schema (studio ConfigPanel parity)', async () => {
    let received: number | undefined;
    const w = defineWidget({
      name: 'm-coerce',
      auth: 'none',
      schema: z.object({ count: z.coerce.number().default(0) }),
      App: ({ config }) => {
        received = config.count;
        return <p data-testid="lbl">{String(config.count)}</p>;
      },
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, w, CSS, { configOverrides: { count: '5' } });
    await waitForEl(host.shadowRoot!, '[data-testid="lbl"]');
    expect(received).toBe(5);
    handle.unmount();
  });

  it('rejects configOverrides the schema rejects — same gate as data-* in prod', () => {
    const w = defineWidget({
      name: 'm-reject',
      auth: 'none',
      schema: z.object({ count: z.coerce.number().max(20).default(0) }),
      App: ({ config }) => <p>{String(config.count)}</p>,
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(() => mount(host, w, CSS, { configOverrides: { count: 99 } })).toThrow();
  });

  it('applies the "true"/"false" shorthand to string overrides — z.coerce.boolean alone is a trap', async () => {
    let received: boolean | undefined;
    const w = defineWidget({
      name: 'm-bool',
      auth: 'none',
      schema: z.object({ hidden: z.coerce.boolean() }),
      App: ({ config }) => {
        received = config.hidden;
        return <p data-testid="lbl">{String(config.hidden)}</p>;
      },
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const handle = mount(host, w, CSS, { configOverrides: { hidden: 'false' } });
    await waitForEl(host.shadowRoot!, '[data-testid="lbl"]');
    expect(received).toBe(false);
    handle.unmount();
  });

  it('prod path unchanged: no overrides → config identical to parseDataAttrs result', async () => {
    let received: number | undefined;
    const w = defineWidget({
      name: 'm-prod',
      auth: 'none',
      schema: z.object({ count: z.coerce.number() }),
      App: ({ config }) => {
        received = config.count;
        return <p data-testid="lbl">{String(config.count)}</p>;
      },
    });
    const host = document.createElement('div');
    host.setAttribute('data-count', '6');
    document.body.appendChild(host);
    const handle = mount(host, w, CSS);
    await waitForEl(host.shadowRoot!, '[data-testid="lbl"]');
    expect(received).toBe(6);
    handle.unmount();
  });
});
