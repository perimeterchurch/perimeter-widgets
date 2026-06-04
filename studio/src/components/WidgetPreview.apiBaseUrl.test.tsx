// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { z } from 'zod';
import * as runtime from '@perimeter/widget-runtime';
import { defineWidget } from '@perimeter/widget-runtime';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { WidgetPreview } from './WidgetPreview';
import type { WidgetEntry } from '../lib/discovery';

// Regression guard for the dev-API wiring (Task 9, DATA/hooks knob). The studio
// must mount widgets against the local perimeter-api (localhost:5500) in dev so
// React Query hooks resolve there instead of the prod default. This is a runtime
// arg to mount(), invisible to typecheck/build — so exercise the render path and
// assert mount() actually receives apiBaseUrl. import.meta.env.DEV is true under
// vitest (mode=test/serve), matching the studio dev harness.

describe('WidgetPreview dev-API wiring (DATA/hooks knob → localhost:5500)', () => {
  // mount() constructs MPLocalStorageAuth which reads localStorage; the test
  // worker may lack it (mirrors render.test.tsx).
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
      slug: 'api-base-test',
      load: () => Promise.resolve({ default: def }),
      loadCss: () => Promise.resolve({ default: '' }),
    };
  }

  it('passes apiBaseUrl=http://localhost:5500 to mount() in dev', async () => {
    expect(import.meta.env.DEV).toBe(true);
    const mountSpy = vi.spyOn(runtime, 'mount');

    const def = defineWidget({
      name: 'api-base-widget',
      auth: 'none',
      schema: z.object({}),
      App: () => <p>ok</p>,
    }) as unknown as WidgetDefinition;

    render(<WidgetPreview entry={entryFor(def)} configOverrides={{}} tokenOverrides={{}} />);

    await waitFor(() => expect(mountSpy).toHaveBeenCalled());
    const extras = mountSpy.mock.calls[0]?.[3];
    expect(extras?.apiBaseUrl).toBe('http://localhost:5500');
  });
});
