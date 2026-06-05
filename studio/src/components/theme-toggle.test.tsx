// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeAll, vi } from 'vitest';
import { render, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import { z } from 'zod';
import { defineWidget } from '@perimeter/widget-runtime';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Canvas } from './Canvas';
import { WidgetPreview } from './WidgetPreview';
import type { WidgetEntry } from '../lib/discovery';

// The light/dark preview toggle: the toolbar control (in Canvas) drives a lifted
// theme state, and WidgetPreview applies data-theme="dark" to the shadow host so
// :host([data-theme="dark"]) matches. typecheck/build can't see either behaviour,
// so exercise both through the DOM. No global RTL auto-cleanup here.

describe('Canvas theme toggle control', () => {
  afterEach(cleanup);

  function renderCanvas(theme: 'light' | 'dark' = 'light') {
    const onThemeChange = vi.fn();
    const utils = render(
      <Canvas theme={theme} onThemeChange={onThemeChange}>
        <div>preview content</div>
      </Canvas>,
    );
    return { ...utils, ui: within(utils.container), onThemeChange };
  }

  it('offers a Light/Dark theme control distinct from the background group', () => {
    const { ui } = renderCanvas();
    const group = ui.getByRole('group', { name: /theme/i });
    const inGroup = within(group);
    expect(inGroup.getByRole('button', { name: /light/i })).toBeTruthy();
    expect(inGroup.getByRole('button', { name: /dark/i })).toBeTruthy();
  });

  it('clicking Dark calls onThemeChange with "dark"', () => {
    const { ui, onThemeChange } = renderCanvas('light');
    const group = within(ui.getByRole('group', { name: /theme/i }));
    fireEvent.click(group.getByRole('button', { name: /dark/i }));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('clicking Light calls onThemeChange with "light"', () => {
    const { ui, onThemeChange } = renderCanvas('dark');
    const group = within(ui.getByRole('group', { name: /theme/i }));
    fireEvent.click(group.getByRole('button', { name: /light/i }));
    expect(onThemeChange).toHaveBeenCalledWith('light');
  });
});

describe('WidgetPreview data-theme on the shadow host', () => {
  afterEach(cleanup);

  // mount() constructs MPLocalStorageAuth which reads localStorage; the test
  // worker leaves it undefined. Mirror the in-memory shim used elsewhere.
  beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map<string, string>();
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
          clear: () => store.clear(),
          key: () => null,
          get length() {
            return store.size;
          },
        },
      });
    }
  });

  function entryFor(def: WidgetDefinition): WidgetEntry {
    return {
      slug: 'theme-test',
      load: () => Promise.resolve({ default: def }),
      loadCss: () => Promise.resolve({ default: '' }),
    };
  }

  const def = defineWidget({
    name: 'theme-widget',
    auth: 'none',
    schema: z.object({}),
    App: () => null,
  }) as unknown as WidgetDefinition;

  it('sets data-theme="dark" on the preview host when theme is dark', async () => {
    const { container } = render(
      <WidgetPreview entry={entryFor(def)} configOverrides={{}} tokenOverrides={{}} theme="dark" />,
    );
    const host = await waitFor(() => {
      const el = container.querySelector<HTMLElement>('[data-perimeter-widget-preview]');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    await waitFor(() => expect(host.getAttribute('data-theme')).toBe('dark'));
  });

  it('does not set data-theme when theme is light', async () => {
    const { container } = render(
      <WidgetPreview
        entry={entryFor(def)}
        configOverrides={{}}
        tokenOverrides={{}}
        theme="light"
      />,
    );
    const host = await waitFor(() => {
      const el = container.querySelector<HTMLElement>('[data-perimeter-widget-preview]');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    expect(host.getAttribute('data-theme')).toBeNull();
  });
});
