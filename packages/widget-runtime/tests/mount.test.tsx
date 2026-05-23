import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { mountWidget } from '../src/mount';
import { nativeRender } from '../src/native-render';
import { defineWidget } from '../src/define-widget';
import { clearAll, registerCss, getInstances } from '../src/registry';

const schema = z.object({
  greeting: z.string().default('Hello'),
  count: z.coerce.number().default(1),
});

const definition = defineWidget({
  name: 'example',
  auth: 'none',
  schema,
  App({ config }) {
    return (
      <div data-testid="content">
        {config.greeting} x{config.count}
      </div>
    );
  },
});

describe('mountWidget', () => {
  beforeEach(() => {
    clearAll();
    registerCss('example', ':host { --color-primary: red; }');
    document.body.innerHTML = '';
  });

  it('mounts the widget into a shadow root and renders the App', async () => {
    const target = document.createElement('div');
    target.setAttribute('data-greeting', 'Hi');
    target.setAttribute('data-count', '3');
    document.body.appendChild(target);

    const handle = mountWidget({ definition, target });
    await vi.waitFor(() => {
      const root = target.shadowRoot;
      expect(root).not.toBeNull();
      expect(root!.querySelector('[data-testid="content"]')?.textContent).toBe('Hi x3');
    });
    expect(getInstances('example')).toHaveLength(1);
    handle.unmount();
  });

  it('unmount removes the React tree and deregisters the instance', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const handle = mountWidget({ definition, target });
    await vi.waitFor(() =>
      expect(target.shadowRoot?.querySelector('[data-testid="content"]')).not.toBeNull(),
    );
    handle.unmount();
    expect(getInstances('example')).toHaveLength(0);
    // After unmount the shadow root no longer contains the testid node.
    expect(target.shadowRoot?.querySelector('[data-testid="content"]')).toBeNull();
  });

  it('injects the resolved token CSS variables', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountWidget({ definition, target });
    await vi.waitFor(() => {
      const styleEls = target.shadowRoot!.querySelectorAll('style');
      const combined = Array.from(styleEls)
        .map((s) => s.textContent ?? '')
        .join('\n');
      expect(combined).toContain('--color-primary');
    });
  });
});

describe('nativeRender', () => {
  it('renders inside a shadow root attached to the provided target', async () => {
    const target = document.createElement('div');
    const host = document.createElement('div');
    document.body.appendChild(target);
    document.body.appendChild(host);
    const handle = nativeRender({ definition, target, hostRoot: host });
    await vi.waitFor(() => {
      expect(target.shadowRoot?.querySelector('[data-testid="content"]')).not.toBeNull();
    });
    handle.unmount();
  });
});
