// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { z } from 'zod';
import { ComponentPreview } from './ComponentPreview';
import { ConfigPanel } from './ConfigPanel';
import type { ComponentEntry } from '../lib/discovery';
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
