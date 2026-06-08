// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { z } from 'zod';
import { defineWidget } from '@perimeter/widget-runtime';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { WidgetPreview } from './WidgetPreview';
import type { WidgetEntry } from '../lib/discovery';

// Regression guard for an intermittent studio test-suite failure: WidgetPreview
// owns a NESTED React root (the widget's shadow-DOM root from mount()). Its effect
// cleanup tore that root down via root.unmount() SYNCHRONOUSLY — and when the
// cleanup runs inside the parent's render/commit (a re-mount on dep change, or
// RTL unmount), React 19 emits "Attempted to synchronously unmount a root while
// React was already rendering" and, under timing pressure, corrupts the file run.
// mount()'s teardown now defers root.unmount() to a microtask, so no warning fires.

describe('WidgetPreview teardown (no synchronous-unmount warning)', () => {
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

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  function entryFor(def: WidgetDefinition): WidgetEntry {
    return {
      slug: 'teardown-test',
      load: () => Promise.resolve({ default: def }),
      loadCss: () => Promise.resolve({ default: '' }),
    };
  }

  function flushMicrotasks() {
    return new Promise((r) => setTimeout(r, 0));
  }

  it('unmounting the preview does not synchronously unmount the widget root mid-render', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const def = defineWidget({
      name: 'teardown-widget',
      auth: 'none',
      schema: z.object({}),
      App: () => <p>ok</p>,
    }) as unknown as WidgetDefinition;

    const { unmount } = render(
      <WidgetPreview entry={entryFor(def)} configOverrides={{}} tokenOverrides={{}} />,
    );

    // Wait for the async module load + mount() to settle (the widget root exists).
    const host = document.querySelector('[data-perimeter-widget-preview]') as HTMLElement;
    await waitFor(() => expect(host.shadowRoot?.childElementCount ?? 0).toBeGreaterThan(0));

    // Tear down the parent: this runs WidgetPreview's effect cleanup → handle.unmount().
    unmount();
    await flushMicrotasks();

    const sawSyncUnmountWarning = errorSpy.mock.calls.some((args) =>
      args.some((a) => typeof a === 'string' && a.includes('synchronously unmount a root')),
    );
    expect(sawSyncUnmountWarning).toBe(false);
  });
});
