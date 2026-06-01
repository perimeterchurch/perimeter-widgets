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
