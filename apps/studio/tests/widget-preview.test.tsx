import * as React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import exampleRaw from '@perimeter/widget-example';
import {
  autoMount,
  disposeAutoMount,
  mountWidget,
  clearAll,
  registerCss,
  type WidgetDefinition,
} from '@perimeter/widget-runtime';
import { ThemeOverridesProvider } from '@/lib/theme-overrides-context';
import { NativeRenderer } from '@/lib/widget-preview/native-renderer';

const example = exampleRaw as unknown as WidgetDefinition;

const BUNDLE = path.resolve(__dirname, '../../../dist/example/example.iife.js');
const noAuth = () => ({
  getToken: () => null,
  isAuthenticated: () => false,
  onChange: () => () => {},
});

beforeEach(() => {
  clearAll();
  registerCss('example', '');
  document.body.innerHTML = '';
  disposeAutoMount();
  // Reset the global so each test starts clean.
  const w = window as unknown as Record<string, unknown>;
  delete w['PerimeterWidgets'];
});

describe('NativeRenderer', () => {
  it('mounts the example widget into a shadow root', async () => {
    const { container } = render(
      <ThemeOverridesProvider>
        <NativeRenderer
          definition={example}
          config={{ greeting: 'Hi', count: '2' }}
          dataThemeAttrs={{}}
        />
      </ThemeOverridesProvider>,
    );
    await vi.waitFor(() => {
      const targetDiv = container.querySelector('[data-greeting]');
      expect(targetDiv?.shadowRoot?.querySelectorAll('h3').length).toBe(2);
    });
  });
});

describe('DOM equality: native vs as-shipped IIFE', () => {
  it('produces equivalent shadow-root HTML for identical config', async () => {
    // 1) Mount the same widget definition directly via the runtime — this is the path
    //    NativeRenderer uses. We compare its output to the IIFE path.
    const a = document.createElement('div');
    a.setAttribute('data-greeting', 'Hi');
    a.setAttribute('data-count', '2');
    document.body.appendChild(a);
    mountWidget({ definition: example, target: a, authFactory: noAuth });
    await vi.waitFor(() => expect(a.shadowRoot?.querySelector('h3')).not.toBeNull());
    const nativeHtml = a.shadowRoot!.innerHTML;

    // 2) Evaluate the built IIFE in this jsdom window, then mount against a fresh target.
    //    The IIFE's autoMount will pick the target up automatically.
    const b = document.createElement('div');
    b.setAttribute('data-perimeter-widget', 'example');
    b.setAttribute('data-greeting', 'Hi');
    b.setAttribute('data-count', '2');
    document.body.appendChild(b);
    const iifeSrc = readFileSync(BUNDLE, 'utf8');
    new Function(iifeSrc)();
    await vi.waitFor(() => expect(b.shadowRoot?.querySelector('h3')).not.toBeNull());
    const asShippedHtml = b.shadowRoot!.innerHTML;

    const norm = (html: string) =>
      html
        .replace(/\s+/g, ' ')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '<style/>')
        .trim();
    expect(norm(asShippedHtml)).toBe(norm(nativeHtml));
  });
});

describe('Late mount via autoMount', () => {
  it('mounts a target added after autoMount runs', async () => {
    autoMount(example);
    const late = document.createElement('div');
    late.setAttribute('data-perimeter-widget', 'example');
    late.setAttribute('data-greeting', 'Late');
    late.setAttribute('data-count', '1');
    act(() => {
      document.body.appendChild(late);
    });
    await vi.waitFor(() => {
      expect(late.shadowRoot?.querySelector('h3')?.textContent).toBe('Late');
    });
  });
});
