import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';
import { autoMount, disposeAutoMount } from '../src/auto-mount';
import { clearAll, registerCss } from '../src/registry';

const def = defineWidget({
  name: 'example',
  auth: 'none',
  schema: z.object({ greeting: z.string().default('Hello') }),
  App({ config }) {
    return <span data-testid="x">{config.greeting}</span>;
  },
});

describe('autoMount', () => {
  beforeEach(() => {
    clearAll();
    registerCss('example', ':host { --color-primary: red; }');
    document.body.innerHTML = '';
    disposeAutoMount();
  });

  it('mounts every matching target present at call time', async () => {
    const a = document.createElement('div');
    a.setAttribute('data-perimeter-widget', 'example');
    const b = document.createElement('div');
    b.setAttribute('data-perimeter-widget', 'example');
    document.body.append(a, b);
    autoMount(def);
    await vi.waitFor(() => {
      expect(a.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull();
      expect(b.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull();
    });
  });

  it('mounts targets added to the DOM after autoMount runs', async () => {
    autoMount(def);
    const c = document.createElement('div');
    c.setAttribute('data-perimeter-widget', 'example');
    document.body.append(c);
    await vi.waitFor(() => {
      expect(c.shadowRoot?.querySelector('[data-testid="x"]')).not.toBeNull();
    });
  });

  it('ignores targets for other widget names', async () => {
    const other = document.createElement('div');
    other.setAttribute('data-perimeter-widget', 'sermons');
    document.body.append(other);
    autoMount(def);
    // Give the observer a tick; nothing should mount.
    await new Promise((r) => setTimeout(r, 20));
    expect(other.shadowRoot).toBeNull();
  });

  it('does not double-mount when called twice', async () => {
    const a = document.createElement('div');
    a.setAttribute('data-perimeter-widget', 'example');
    document.body.append(a);
    autoMount(def);
    autoMount(def);
    await vi.waitFor(() => {
      const styleCount = a.shadowRoot!.querySelectorAll('[data-perimeter-theme]').length;
      expect(styleCount).toBe(1);
    });
  });
});
