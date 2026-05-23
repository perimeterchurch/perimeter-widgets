import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { ensureGlobal } from '../src/global';
import { clearAll, registerCss } from '../src/registry';
import { mountWidget } from '../src/mount';

const def = defineWidget({
  name: 'example',
  auth: 'none',
  schema: z.object({}),
  App: () => <div data-testid="x">ok</div>,
});

describe('window.PerimeterWidgets', () => {
  beforeEach(() => {
    clearAll();
    registerCss('example', ':host {}');
    (window as unknown as { PerimeterWidgets?: unknown }).PerimeterWidgets = undefined;
    document.body.innerHTML = '';
  });

  it('attaches the definition under its name', () => {
    ensureGlobal(def);
    expect(window.PerimeterWidgets.widgets['example']).toBe(def);
  });

  it('applyOverrides re-renders every live instance with new tokens', async () => {
    ensureGlobal(def);
    const a = document.createElement('div');
    document.body.appendChild(a);
    mountWidget({ definition: def, target: a });
    await vi.waitFor(() => expect(a.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull());

    window.PerimeterWidgets.applyOverrides('example', { 'color-primary': 'hsl(99 99% 99%)' });
    const styleEls = a.shadowRoot!.querySelectorAll('style');
    const combined = Array.from(styleEls)
      .map((s) => s.textContent ?? '')
      .join('\n');
    expect(combined).toContain('--color-primary: hsl(99 99% 99%)');
  });

  it('mount() returns a MountedWidget that can be unmounted', () => {
    ensureGlobal(def);
    const target = document.createElement('div');
    document.body.appendChild(target);
    const handle = window.PerimeterWidgets.mount('example', target);
    expect(target.shadowRoot).not.toBeNull();
    handle.unmount();
  });
});
