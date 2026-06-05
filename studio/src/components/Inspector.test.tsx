// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, within, cleanup } from '@testing-library/react';
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Inspector } from './Inspector';

// Render-path regression guard for the inspector. typecheck/build pass even when
// a panel crashes at runtime, so exercise the actual tab switching + reset here.
// This suite has no global RTL auto-cleanup; unmount each render so the panels
// don't leak into later tests' shared document.

const definition: WidgetDefinition = {
  name: 'example',
  auth: 'none',
  schema: z.object({
    greeting: z.string().default('Hello'),
    count: z.coerce.number().int().min(0).max(20).default(3),
    tab: z.enum(['sermons', 'series']).optional(),
  }),
  App: () => null,
};

describe('Inspector', () => {
  afterEach(cleanup);

  function renderInspector(overrides?: {
    config?: Record<string, unknown>;
    theme?: Record<string, string>;
    onConfigChange?: (next: Record<string, unknown>) => void;
    onThemeChange?: (next: Record<string, string>) => void;
  }) {
    const onConfigChange = overrides?.onConfigChange ?? vi.fn();
    const onThemeChange = overrides?.onThemeChange ?? vi.fn();
    const result = render(
      <Inspector
        definition={definition}
        slug="example"
        configOverrides={overrides?.config ?? {}}
        tokenOverrides={overrides?.theme ?? {}}
        onConfigChange={onConfigChange}
        onThemeChange={onThemeChange}
      />,
    );
    return { ...result, onConfigChange, onThemeChange };
  }

  it('renders three tabs: Config, Theme, Info', () => {
    const { container } = renderInspector();
    const scope = within(container);
    expect(scope.getByRole('tab', { name: 'Config' })).toBeTruthy();
    expect(scope.getByRole('tab', { name: 'Theme' })).toBeTruthy();
    expect(scope.getByRole('tab', { name: 'Info' })).toBeTruthy();
  });

  it('renders the category tabs as a full-width row above the active panel', () => {
    const { container } = renderInspector();
    const scope = within(container);

    // The header tab bar is built directly (a role=tablist row of buttons), NOT
    // the @perimeter/ui Tabs compound, so it doesn't fight that component's
    // orientation handling. It must be a real flex row that spans the full
    // inspector width so the flex-1 triggers distribute evenly across the top.
    const list = scope.getByRole('tablist');
    const listClasses = list.className.split(/\s+/);
    expect(listClasses).toContain('flex');
    expect(listClasses).toContain('w-full');

    // The list must precede the active panel so it reads as a top row.
    const panel = scope.getByRole('tabpanel');
    expect(list.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('distributes the header tabs evenly with the active one marked aria-selected', () => {
    const { container } = renderInspector();
    const scope = within(container);

    // Each trigger takes an equal share of the row (flex-1) so the three
    // categories read as an evenly-distributed segmented control.
    for (const name of ['Config', 'Theme', 'Info']) {
      const tab = scope.getByRole('tab', { name });
      expect(tab.className.split(/\s+/)).toContain('flex-1');
    }

    // Config is the default — exactly one tab is selected, and it is Config.
    const tabs = scope.getAllByRole('tab');
    const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]?.textContent).toBe('Config');

    // Clicking another tab moves the selection.
    fireEvent.click(scope.getByRole('tab', { name: 'Theme' }));
    expect(scope.getByRole('tab', { name: 'Theme' }).getAttribute('aria-selected')).toBe('true');
    expect(scope.getByRole('tab', { name: 'Config' }).getAttribute('aria-selected')).toBe('false');
  });

  it('shows the embed snippet exactly once (not duplicated across tabs)', () => {
    const { container } = renderInspector();
    const scope = within(container);

    // The snippet used to be rendered in both the Config and Info panels. It must
    // now appear a single time regardless of which tab is active.
    const matches = scope.getAllByText(
      (_text, node) =>
        node?.tagName === 'PRE' &&
        (node.textContent ?? '').includes('widgets.perimeter.org/example/latest.js'),
    );
    expect(matches).toHaveLength(1);

    // Still present after switching tabs (it lives outside the tab panels).
    fireEvent.click(scope.getByRole('tab', { name: 'Info' }));
    const afterSwitch = scope.getAllByText(
      (_text, node) =>
        node?.tagName === 'PRE' &&
        (node.textContent ?? '').includes('widgets.perimeter.org/example/latest.js'),
    );
    expect(afterSwitch).toHaveLength(1);
  });

  it('defaults to the Config tab showing the schema field inputs', () => {
    const { container } = renderInspector();
    const scope = within(container);
    // ConfigPanel renders a labelled input per schema key.
    expect(scope.getByText('greeting')).toBeTruthy();
    expect(scope.getByText('count')).toBeTruthy();
  });

  it('lays out Config field rows with an auto-label / flexible-input grid', () => {
    const { container } = renderInspector();
    const scope = within(container);
    // The old `grid-cols-2` split label/input 1:1 and squeezed inputs in the
    // narrow drawer. The label column should size to content (min 6rem) and the
    // input column take the remaining space.
    const fieldLabel = scope.getByText('greeting').closest('label') as HTMLElement;
    expect(fieldLabel).toBeTruthy();
    const classes = fieldLabel.className.split(/\s+/);
    expect(classes).toContain('grid-cols-[minmax(6rem,auto)_1fr]');
    expect(classes).not.toContain('grid-cols-2');
  });

  it('lays out Theme token rows with the same auto-label / flexible-input grid', () => {
    const { container } = renderInspector();
    const scope = within(container);
    fireEvent.click(scope.getByRole('tab', { name: 'Theme' }));

    // ThemeEditor rows previously clamped the input to 9rem; widen to a flexible
    // 1fr input column so token values get room in the wider drawer. The row is a
    // plain div (not a wrapping label) so the color picker can't steal the text
    // input's accessible name.
    const [firstColorToken] = scope.getAllByText(/^color-/);
    const tokenRow = firstColorToken?.closest(
      'div.grid-cols-\\[minmax\\(6rem\\,auto\\)_1fr\\]',
    ) as HTMLElement;
    expect(tokenRow).toBeTruthy();
    const classes = tokenRow.className.split(/\s+/);
    expect(classes).toContain('grid-cols-[minmax(6rem,auto)_1fr]');
    expect(classes).not.toContain('grid-cols-[1fr_minmax(0,9rem)]');
  });

  it('switches to the Info tab and lists schema fields with type and default', () => {
    const { container } = renderInspector();
    const scope = within(container);

    fireEvent.click(scope.getByRole('tab', { name: 'Info' }));

    // Widget meta.
    expect(scope.getByText('example')).toBeTruthy();
    expect(scope.getByText('none')).toBeTruthy();

    // Schema field table: key, derived zod type, default.
    const greetingRow = scope.getByText('greeting').closest('tr');
    expect(greetingRow).toBeTruthy();
    expect(within(greetingRow as HTMLElement).getByText('string')).toBeTruthy();
    expect(within(greetingRow as HTMLElement).getByText('Hello')).toBeTruthy();

    const countRow = scope.getByText('count').closest('tr');
    expect(within(countRow as HTMLElement).getByText('number')).toBeTruthy();
    expect(within(countRow as HTMLElement).getByText('3')).toBeTruthy();
  });

  it('switches to the Theme tab and resets overrides to {} on reset', () => {
    const onThemeChange = vi.fn();
    const { container } = renderInspector({
      theme: { 'color-primary': 'hsl(0 0% 0%)' },
      onThemeChange,
    });
    const scope = within(container);

    fireEvent.click(scope.getByRole('tab', { name: 'Theme' }));

    const reset = scope.getByRole('button', { name: /reset/i });
    fireEvent.click(reset);
    expect(onThemeChange).toHaveBeenCalledWith({});
  });
});
