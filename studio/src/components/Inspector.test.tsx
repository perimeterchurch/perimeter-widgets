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

    // The tab row must be a real flex row that spans the full inspector width so
    // the flex-1 triggers distribute across the top (not pack tight/left from the
    // default inline-flex w-fit list). Local Inspector override — NOT a global
    // tabs.tsx change (that would stretch the sermons tab rows).
    const list = scope.getByRole('tablist');
    const listClasses = list.className.split(/\s+/);
    // A standalone `flex` (block-level flex container), not the cva base
    // `inline-flex` which sizes to content even with w-full present.
    expect(listClasses).toContain('flex');
    expect(listClasses).toContain('w-full');

    // The list must precede the active panel so it reads as a top row.
    const panel = scope.getByRole('tabpanel');
    expect(list.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('defaults to the Config tab showing the schema field inputs', () => {
    const { container } = renderInspector();
    const scope = within(container);
    // ConfigPanel renders a labelled input per schema key.
    expect(scope.getByText('greeting')).toBeTruthy();
    expect(scope.getByText('count')).toBeTruthy();
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
