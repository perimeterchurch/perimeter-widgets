// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, within, cleanup } from '@testing-library/react';
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { ConfigPanel } from './ConfigPanel';

// ConfigPanel used to render EVERY field as a raw text input, so a boolean typed
// "true" became the string "true" and the schema rejected it. typecheck/build
// pass even when the control type is wrong, so assert the rendered control per
// field type, the typed onChange payload, and the per-field hint here.
// No global RTL auto-cleanup in this suite — unmount each render.

function makeDefinition(schema: z.ZodTypeAny): WidgetDefinition {
  return { name: 'example', auth: 'none', schema, App: () => null } as WidgetDefinition;
}

const definition = makeDefinition(
  z.object({
    greeting: z.string().describe('Heading text shown above the list').default('Hello'),
    featured: z.boolean().describe('Pin the newest item to the top').default(false),
    layout: z.enum(['grid', 'list']).describe('How items are arranged').default('grid'),
    count: z.coerce.number().min(0).max(20).describe('How many items to show').default(3),
  }),
);

describe('ConfigPanel', () => {
  afterEach(cleanup);

  function renderPanel(overrides?: {
    config?: Record<string, unknown>;
    onChange?: (next: Record<string, unknown>) => void;
    def?: WidgetDefinition;
  }) {
    const onChange = overrides?.onChange ?? vi.fn();
    const result = render(
      <ConfigPanel
        definition={overrides?.def ?? definition}
        overrides={overrides?.config ?? {}}
        onChange={onChange}
      />,
    );
    return { ...result, onChange };
  }

  it('renders a checkbox for a boolean field and emits a real boolean on change', () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ onChange });
    const scope = within(container);
    const row = scope.getByText('featured').closest('label') as HTMLElement;
    const input = within(row).getByRole<HTMLInputElement>('checkbox');
    expect(input.type).toBe('checkbox');
    fireEvent.click(input);
    // objectContaining uses strict equality, so a real boolean `true` matches but
    // the string "true" (the old all-text-input bug) would not.
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ featured: true }));
  });

  it('renders a select with the enum options for an enum field', () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ onChange });
    const scope = within(container);
    const row = scope.getByText('layout').closest('label') as HTMLElement;
    const select = within(row).getByRole<HTMLSelectElement>('combobox');
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['grid', 'list']);
    fireEvent.change(select, { target: { value: 'list' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ layout: 'list' }));
  });

  it('renders a number input with min/max and emits a real number on change', () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ onChange });
    const scope = within(container);
    const row = scope.getByText('count').closest('label') as HTMLElement;
    const input = within(row).getByRole<HTMLInputElement>('spinbutton');
    expect(input.type).toBe('number');
    expect(input.min).toBe('0');
    expect(input.max).toBe('20');
    fireEvent.change(input, { target: { value: '7' } });
    // Strict equality again — the real number 7, not the string "7".
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ count: 7 }));
  });

  it('renders a text input for a string field and emits a string on change', () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ onChange });
    const scope = within(container);
    const row = scope.getByText('greeting').closest('label') as HTMLElement;
    const input = within(row).getByRole<HTMLInputElement>('textbox');
    expect(input.type).toBe('text');
    fireEvent.change(input, { target: { value: 'Welcome' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ greeting: 'Welcome' }));
  });

  it('shows a per-field hint with the description and allowed values/range/default', () => {
    const { container } = renderPanel();
    const scope = within(container);

    const layoutRow = scope.getByText('layout').closest('label') as HTMLElement;
    expect(within(layoutRow).getByText(/How items are arranged/)).toBeTruthy();
    expect(within(layoutRow).getByText(/grid \| list/)).toBeTruthy();

    const countRow = scope.getByText('count').closest('label') as HTMLElement;
    expect(within(countRow).getByText(/How many items to show/)).toBeTruthy();
    expect(within(countRow).getByText(/0.*20/)).toBeTruthy();

    const greetingRow = scope.getByText('greeting').closest('label') as HTMLElement;
    expect(within(greetingRow).getByText(/Hello/)).toBeTruthy();
  });

  it('tokenizes the inputs so they remain legible in dark mode', () => {
    const { container } = renderPanel();
    const scope = within(container);
    const input = within(scope.getByText('greeting').closest('label') as HTMLElement).getByRole(
      'textbox',
    );
    const classes = input.className.split(/\s+/);
    expect(classes).toContain('border-border');
    expect(classes).toContain('bg-bg');
    expect(classes).toContain('text-fg');
  });

  it('keeps the auto-label / flexible-input grid on each field row, vertically centered', () => {
    const { container } = renderPanel();
    const scope = within(container);
    const row = scope.getByText('greeting').closest('label') as HTMLElement;
    const classes = row.className.split(/\s+/);
    // A wider label column (7rem) keeps long keys on one line, and `items-center`
    // (not the old `items-baseline`) puts every control on the same horizontal
    // line as its label so the control column's left edges align.
    expect(classes).toContain('grid-cols-[minmax(7rem,auto)_1fr]');
    expect(classes).toContain('items-center');
    expect(classes).not.toContain('items-baseline');
    expect(classes).not.toContain('grid-cols-2');
  });

  it('gives text/number/select controls a uniform full-width height so their edges align', () => {
    const { container } = renderPanel();
    const scope = within(container);
    for (const key of ['greeting', 'count', 'layout'] as const) {
      const row = scope.getByText(key).closest('label') as HTMLElement;
      const control = within(row).getByRole(
        key === 'count' ? 'spinbutton' : key === 'layout' ? 'combobox' : 'textbox',
      );
      const classes = control.className.split(/\s+/);
      expect(classes, `${key} control should be h-9`).toContain('h-9');
      expect(classes, `${key} control should be w-full`).toContain('w-full');
    }
  });

  it('left-aligns the boolean checkbox in the control column instead of stretching it', () => {
    const { container } = renderPanel();
    const scope = within(container);
    const row = scope.getByText('featured').closest('label') as HTMLElement;
    const checkbox = within(row).getByRole('checkbox');
    const classes = checkbox.className.split(/\s+/);
    expect(classes).toContain('justify-self-start');
    // The checkbox stays its intrinsic size — it must NOT inherit the controls'
    // full-width height treatment.
    expect(classes).not.toContain('w-full');
    expect(classes).not.toContain('h-9');
  });

  it('falls back to a tokenized JSON textarea for a non-object schema', () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ def: makeDefinition(z.string()), onChange });
    const scope = within(container);
    const textarea = scope.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
    const classes = textarea.className.split(/\s+/);
    expect(classes).toContain('border-border');
    expect(classes).toContain('bg-bg');
    expect(classes).toContain('text-fg');
  });
});
