// @vitest-environment happy-dom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { render, waitFor, within, cleanup } from '@testing-library/react';
import { WidgetPreview } from './WidgetPreview';
import type { WidgetEntry } from '../lib/discovery';

// A widget's dynamic module/CSS import can fail (a bad chunk, a network blip in
// the deployed studio, a renamed entry). The runtime ErrorBoundary only catches
// RENDER crashes of an already-mounted widget — a failed `entry.load()` never
// reaches it. WidgetPreview must surface that load/mount failure as a distinct
// canvas state, not a blank frame.

describe('WidgetPreview module-load failure', () => {
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

  afterEach(cleanup);

  function failingEntry(): WidgetEntry {
    return {
      slug: 'broken',
      load: () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
      loadCss: () => Promise.resolve({ default: '' }),
    };
  }

  it('renders a distinct load-error state when the module import rejects', async () => {
    const { container } = render(
      <WidgetPreview entry={failingEntry()} configOverrides={{}} tokenOverrides={{}} />,
    );
    const scope = within(container);

    const alert = await waitFor(() => scope.getByRole('alert'));
    // A load-error marker distinct from the config/validation error path.
    expect(container.querySelector('[data-perimeter-widget-load-error]')).toBeTruthy();
    expect(alert.textContent).toMatch(/load/i);
  });
});
