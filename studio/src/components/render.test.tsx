// @vitest-environment happy-dom
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { z } from 'zod';
import { ComponentPreview } from './ComponentPreview';
import { ComponentStage } from './ComponentStage';
import { ConfigPanel } from './ConfigPanel';
import { WidgetPreview } from './WidgetPreview';
import { HostFrame } from './HostFrame';
import { countAppliedSheets, defineWidget } from '@perimeter/widget-runtime';
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
    const { container } = render(<ComponentPreview entry={entry} />);
    // The gallery now renders inside the ComponentStage shadow root (H3), so
    // testing-library's light-DOM `screen` cannot see it — query the shadow root.
    const shadowText = () => container.querySelector('div')?.shadowRoot?.textContent ?? '';
    // Healthy component renders…
    await waitFor(() => expect(shadowText()).toContain('good-ok'));
    // …and the throwing one shows the isolated fallback instead of unmounting everything.
    expect(shadowText()).toMatch(/standalone/i);
  });
});

describe('ComponentStage', () => {
  it('renders children inside a shadow root with widget styling applied', async () => {
    const { container } = render(
      <ComponentStage>
        <button className="p-4">x</button>
      </ComponentStage>,
    );
    // Wait for the portal to mount its child into the shadow root.
    await waitFor(() => {
      const host = container.querySelector('div') as HTMLElement;
      expect(host.shadowRoot).toBeTruthy();
      expect(host.shadowRoot?.querySelector('button')).toBeTruthy();
    });
    const host = container.querySelector('div') as HTMLElement;
    const shadow = host.shadowRoot as ShadowRoot;
    // Widget sheet + token sheet — the same two layers a shipped widget applies.
    expect(countAppliedSheets(shadow)).toBe(2);
    // The button is inside the shadow root, NOT in the light DOM under the host.
    expect(shadow.querySelector('button')?.textContent).toBe('x');
    expect(host.querySelector('button')).toBeNull();
  });
});

describe('HostFrame (host-page-sim canvas, H4)', () => {
  // This suite has no global RTL auto-cleanup; unmount our render so the
  // mounted WidgetPreview host does not leak into later tests' shared document.
  afterEach(cleanup);

  function entryFor(def: WidgetDefinition): WidgetEntry {
    return {
      slug: 'host-frame-test',
      load: () => Promise.resolve({ default: def }),
      loadCss: () => Promise.resolve({ default: '' }),
    };
  }

  it('places [data-host-frame] with the host body font-size (19px) above the widget preview host', async () => {
    const def = defineWidget({
      name: 'host-frame-widget',
      auth: 'none',
      schema: z.object({}),
      App: () => <p>inside</p>,
    }) as unknown as WidgetDefinition;

    const { container } = render(
      <HostFrame>
        <WidgetPreview entry={entryFor(def)} configOverrides={{}} tokenOverrides={{}} />
      </HostFrame>,
    );

    // The widget preview host mounts after its module/css load.
    const host = await waitFor(() => {
      const el = container.querySelector<HTMLElement>('[data-perimeter-widget-preview]');
      expect(el).toBeTruthy();
      return el;
    });

    // Walk the ancestor chain up to the host-page-sim frame.
    const frame = host?.closest<HTMLElement>('[data-host-frame]');
    expect(frame).toBeTruthy();
    expect(frame?.style.fontSize).toBe('19px');
    expect(frame?.style.lineHeight).toBe('35px');
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
