// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { ComponentPreview } from './ComponentPreview';
import { ConfigPanel } from './ConfigPanel';
import { WidgetPreview } from './WidgetPreview';
import { defineWidget } from '@perimeter/widget-runtime';
import type { ComponentEntry, WidgetEntry } from '../lib/discovery';
import type { WidgetDefinition } from '@perimeter/widget-runtime';

// Render-path regression guards. typecheck/build pass even when these crash at
// runtime (which is how three studio bugs reached the browser), so exercise the
// actual render here.

function Good() {
  return <div>good-ok</div>;
}
function Throws(): never {
  throw new Error('needs props');
}

describe('ComponentPreview', () => {
  it('renders healthy components and isolates a throwing one (no gallery crash)', async () => {
    const entry: ComponentEntry = {
      name: 'demo',
      load: () => Promise.resolve({ Good, Throws }),
    };
    render(<ComponentPreview entry={entry} />);
    // Healthy component renders…
    await waitFor(() => expect(screen.getByText('good-ok')).toBeTruthy());
    // …and the throwing one shows the isolated fallback instead of unmounting everything.
    expect(screen.getByText(/standalone/i)).toBeTruthy();
  });
});

describe('ConfigPanel', () => {
  it('shows per-field inputs for a refined schema (z.object().refine() = ZodEffects)', () => {
    const def = {
      name: 'x',
      auth: 'none',
      schema: z.object({ perPage: z.coerce.number().default(12) }).refine(() => true),
      App: () => null,
    } as unknown as WidgetDefinition;
    render(<ConfigPanel definition={def} overrides={{}} onChange={() => {}} />);
    expect(screen.getByText('perPage')).toBeTruthy();
  });
});

describe('WidgetPreview config gate (studio configOverrides exercise the prod zod gate)', () => {
  // mount() unconditionally constructs MPLocalStorageAuth, which reads localStorage.
  // The studio test env (vite.config.ts, no --no-experimental-webstorage) leaves it
  // undefined in the worker, so provide a minimal in-memory shim. The browser studio
  // has real localStorage; this only fills the test-worker gap.
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
      slug: 'gate-test',
      load: () => Promise.resolve({ default: def }),
      loadCss: () => Promise.resolve({ default: '' }),
    };
  }

  it('surfaces a visible error box (no white-screen) when configOverrides fail the schema', async () => {
    const def = defineWidget({
      name: 'gate-reject',
      auth: 'none',
      schema: z.object({ n: z.coerce.number().max(5).default(0) }),
      App: ({ config }) => <p>{String(config.n)}</p>,
    }) as unknown as WidgetDefinition;

    render(
      <WidgetPreview entry={entryFor(def)} configOverrides={{ n: '99' }} tokenOverrides={{}} />,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/n:/)).toBeTruthy();
  });

  it('recovers from the error state when overrides become valid (clear on next successful mount)', async () => {
    const def = defineWidget({
      name: 'gate-recover',
      auth: 'none',
      schema: z.object({ n: z.coerce.number().max(5).default(0) }),
      App: ({ config }) => <p data-testid="n-value">{String(config.n)}</p>,
    }) as unknown as WidgetDefinition;

    const entry = entryFor(def);
    // Scope queries to this render's own container — the suite has no RTL
    // auto-cleanup (no test-globals config), so a prior test's identical alert
    // would otherwise leak into the shared document and mask this assertion.
    // Start invalid → error box, host hidden but still attached.
    const { rerender, container } = render(
      <WidgetPreview entry={entry} configOverrides={{ n: '99' }} tokenOverrides={{}} />,
    );
    const within = () => container.querySelector('[role="alert"]');
    await waitFor(() => expect(within()).toBeTruthy());

    // Correct the config → the effect must re-run against the still-attached host,
    // clear the error, and render the valid App.
    rerender(<WidgetPreview entry={entry} configOverrides={{ n: '3' }} tokenOverrides={{}} />);
    await waitFor(() => expect(within()).toBeNull());
    // The host is visible again (the App renders inside its shadow root, which
    // testing-library's light-DOM `screen` queries cannot see).
    const host = container.querySelector('[data-perimeter-widget-preview]') as HTMLElement;
    expect(host).toBeTruthy();
    expect(host.hidden).toBe(false);
  });

  it('applies the "true"/"false" shorthand end-to-end: string "false" reaches the App as false', async () => {
    let received: boolean | undefined;
    const def = defineWidget({
      name: 'gate-bool',
      auth: 'none',
      schema: z.object({ hidden: z.coerce.boolean() }),
      App: ({ config }) => {
        received = config.hidden;
        return <p data-testid="bool">{String(config.hidden)}</p>;
      },
    }) as unknown as WidgetDefinition;

    render(
      <WidgetPreview
        entry={entryFor(def)}
        configOverrides={{ hidden: 'false' }}
        tokenOverrides={{}}
      />,
    );
    await waitFor(() => expect(received).toBe(false));
  });
});
