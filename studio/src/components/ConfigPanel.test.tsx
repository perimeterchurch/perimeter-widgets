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
    // Mirrors the real `showImage: z.coerce.boolean().default(true)` shape — the
    // default-ON case the switch has to render as on with no override present.
    showImage: z.coerce.boolean().describe('Show the artwork').default(true),
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

  it('renders an on/off switch for a boolean field and emits a real boolean on change', () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ onChange });
    const scope = within(container);
    const row = scope.getByText('featured').closest('label') as HTMLElement;
    // `role="switch"` (not the implicit checkbox role) is what makes assistive tech
    // announce the control as on/off — the whole point of the change.
    const input = within(row).getByRole<HTMLInputElement>('switch');
    expect(input.type).toBe('checkbox');
    fireEvent.click(input);
    // objectContaining uses strict equality, so a real boolean `true` matches but
    // the string "true" (the old all-text-input bug) would not.
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ featured: true }));
  });

  // The reported confusion: a `default(true)` field rendered OFF because `overrides`
  // has no entry until you touch it, while its hint said "Default: true". The switch
  // has to show what the widget is actually doing.
  it('shows a boolean switch as ON from the schema default when no override is set', () => {
    const { container } = renderPanel();
    const scope = within(container);
    const on = within(scope.getByText('showImage').closest('label') as HTMLElement).getByRole(
      'switch',
    );
    expect((on as HTMLInputElement).checked).toBe(true);

    // …and a default(false) field still reads off, so this isn't just "always on".
    const off = within(scope.getByText('featured').closest('label') as HTMLElement).getByRole(
      'switch',
    );
    expect((off as HTMLInputElement).checked).toBe(false);
  });

  it('lets an explicit override win over the schema default in both directions', () => {
    const { container } = renderPanel({ config: { showImage: false, featured: true } });
    const scope = within(container);
    const showImage = within(
      scope.getByText('showImage').closest('label') as HTMLElement,
    ).getByRole('switch');
    const featured = within(scope.getByText('featured').closest('label') as HTMLElement).getByRole(
      'switch',
    );
    expect((showImage as HTMLInputElement).checked).toBe(false);
    expect((featured as HTMLInputElement).checked).toBe(true);
  });

  it('emits false when switching a default-on boolean off', () => {
    const onChange = vi.fn();
    const { container } = renderPanel({ onChange });
    const scope = within(container);
    const input = within(scope.getByText('showImage').closest('label') as HTMLElement).getByRole(
      'switch',
    );
    fireEvent.click(input);
    // Strict equality: a real boolean `false`, which `applyBoolShorthand` also
    // round-trips through the embed's `data-show-image="false"`.
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ showImage: false }));
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

  it('left-aligns the boolean switch in the control column instead of stretching it', () => {
    const { container } = renderPanel();
    const scope = within(container);
    const row = scope.getByText('featured').closest('label') as HTMLElement;
    // Two spans deep: the input's parent is the switch track, and THAT sits in the
    // flex wrapper holding track + readout. The wrapper is the grid item, so it's
    // what has to be left-aligned in the control column.
    const wrapper = within(row).getByRole('switch').parentElement?.parentElement as HTMLElement;
    const classes = wrapper.className.split(/\s+/);
    expect(classes).toContain('justify-self-start');
    // The switch stays its intrinsic size — it must NOT inherit the controls'
    // full-width height treatment.
    expect(classes).not.toContain('w-full');
    expect(classes).not.toContain('h-9');
  });

  // The readout mirrors the `data-*` value the embed snippet carries, so it must say
  // true/false — matching the hint's "Default: true" — not a second On/Off vocabulary.
  it('labels the switch with the true/false value it will emit', () => {
    const { container } = renderPanel({ config: { featured: true } });
    const scope = within(container);

    const on = within(scope.getByText('featured').closest('label') as HTMLElement);
    expect(on.getByText('true')).toBeTruthy();

    // showImage defaults to true, so an explicit-false override must read "false".
    const { container: c2 } = render(
      <ConfigPanel definition={definition} overrides={{ showImage: false }} onChange={vi.fn()} />,
    );
    const off = within(within(c2).getByText('showImage').closest('label') as HTMLElement);
    expect(off.getByText('false')).toBeTruthy();
  });

  it('hides the switch readout from assistive tech so the state is not announced twice', () => {
    const { container } = renderPanel();
    const scope = within(container);
    const row = scope.getByText('showImage').closest('label') as HTMLElement;
    // The switch role already conveys on/off; the visible text is a sighted-user
    // duplicate and would otherwise land in the control's accessible name.
    expect(within(row).getByText('true').getAttribute('aria-hidden')).toBe('true');
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
