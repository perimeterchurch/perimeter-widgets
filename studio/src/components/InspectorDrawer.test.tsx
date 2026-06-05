// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, within, cleanup } from '@testing-library/react';
import { z } from 'zod';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { InspectorDrawer } from './InspectorDrawer';

// Render-path regression guard for the hand-rolled inspector drawer. The drawer
// has no @perimeter/ui primitive backing it (open/close/Escape/focus-return are
// all explicit), and those behaviours are invisible to typecheck/build — so
// exercise them through the DOM. This suite has no global RTL auto-cleanup;
// unmount each render so the panels don't leak into later tests' shared document.

const definition: WidgetDefinition = {
  name: 'example',
  auth: 'none',
  schema: z.object({
    greeting: z.string().default('Hello'),
  }),
  App: () => null,
};

function renderDrawer() {
  return render(
    <InspectorDrawer
      definition={definition}
      slug="example"
      configOverrides={{}}
      tokenOverrides={{}}
      onConfigChange={vi.fn()}
      onThemeChange={vi.fn()}
    />,
  );
}

describe('InspectorDrawer', () => {
  afterEach(cleanup);

  it('is closed by default: no dialog in the document', () => {
    const { container } = renderDrawer();
    const scope = within(container);
    expect(scope.queryByRole('dialog')).toBeNull();
    // The toggle that opens it is present and accessible.
    expect(scope.getByRole('button', { name: /inspector/i })).toBeTruthy();
  });

  it('opens when the toggle is clicked: a labelled modal dialog appears', () => {
    const { container } = renderDrawer();
    const scope = within(container);
    fireEvent.click(scope.getByRole('button', { name: /inspector/i }));

    const dialog = scope.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBeTruthy();
    // The inspector content (its tabs) renders inside.
    expect(within(dialog).getByRole('tab', { name: 'Config' })).toBeTruthy();
  });

  it('uses a wide drawer panel (30rem) so config/theme fields fit comfortably', () => {
    const { container } = renderDrawer();
    const scope = within(container);
    fireEvent.click(scope.getByRole('button', { name: /inspector/i }));

    // The panel was 22rem, which squeezed long token labels against the inputs.
    // It must be widened to 30rem (capped at 90vw so it never overflows a phone).
    const dialog = scope.getByRole('dialog');
    const classes = dialog.className.split(/\s+/);
    expect(classes).toContain('w-[30rem]');
    expect(classes).toContain('max-w-[90vw]');
  });

  it('closes when the close button is clicked', () => {
    const { container } = renderDrawer();
    const scope = within(container);
    fireEvent.click(scope.getByRole('button', { name: /inspector/i }));
    expect(scope.getByRole('dialog')).toBeTruthy();

    const dialog = scope.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /close/i }));
    expect(scope.queryByRole('dialog')).toBeNull();
  });

  it('closes when the backdrop is clicked', () => {
    const { container } = renderDrawer();
    const scope = within(container);
    fireEvent.click(scope.getByRole('button', { name: /inspector/i }));
    expect(scope.getByRole('dialog')).toBeTruthy();

    const backdrop = container.querySelector('[data-inspector-backdrop]') as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);
    expect(scope.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape and returns focus to the toggle', () => {
    const { container } = renderDrawer();
    const scope = within(container);
    const toggle = scope.getByRole('button', { name: /inspector/i });
    fireEvent.click(toggle);
    expect(scope.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(scope.queryByRole('dialog')).toBeNull();
    // Focus returns to the toggle that opened the drawer.
    expect(document.activeElement).toBe(toggle);
  });
});
