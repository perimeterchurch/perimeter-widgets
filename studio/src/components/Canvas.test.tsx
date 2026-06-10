// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { useState } from 'react';
import { render, within, fireEvent, cleanup } from '@testing-library/react';
import { Canvas } from './Canvas';

// The studio suite has no global RTL auto-cleanup; scope queries to each render's
// own container and unmount between tests so renders don't leak. Canvas is pure
// chrome (no mount()), but render-path bugs are invisible to typecheck/build, so
// exercise the actual viewport-preset logic through the DOM.
afterEach(cleanup);

// The element whose width the presets drive carries this marker so the test can
// read its inline style without depending on the children's markup.
const FRAME = '[data-canvas-frame]';

describe('Canvas viewport presets', () => {
  function renderCanvas() {
    const utils = render(
      <Canvas>
        <div>preview content</div>
      </Canvas>,
    );
    const ui = within(utils.container);
    const frame = () => utils.container.querySelector(FRAME) as HTMLElement;
    return { ...utils, ui, frame };
  }

  it('renders the preset buttons and the fluid default', () => {
    const { ui } = renderCanvas();
    expect(ui.getByRole('button', { name: /mobile/i })).toBeTruthy();
    expect(ui.getByRole('button', { name: /tablet/i })).toBeTruthy();
    expect(ui.getByRole('button', { name: /desktop/i })).toBeTruthy();
    expect(ui.getByRole('button', { name: /fluid/i })).toBeTruthy();
  });

  it('starts fluid: no fixed width on the frame', () => {
    const { frame } = renderCanvas();
    expect(frame().style.width).toBe('');
  });

  it('clicking Mobile constrains the frame to 375px', () => {
    const { ui, frame } = renderCanvas();
    fireEvent.click(ui.getByRole('button', { name: /mobile/i }));
    expect(frame().style.width).toBe('375px');
  });

  it('clicking Tablet then Fluid removes the width constraint', () => {
    const { ui, frame } = renderCanvas();
    fireEvent.click(ui.getByRole('button', { name: /tablet/i }));
    expect(frame().style.width).toBe('768px');
    fireEvent.click(ui.getByRole('button', { name: /fluid/i }));
    expect(frame().style.width).toBe('');
  });

  it('a custom width overrides the active preset', () => {
    const { ui, frame } = renderCanvas();
    fireEvent.click(ui.getByRole('button', { name: /desktop/i }));
    expect(frame().style.width).toBe('1280px');

    const custom = ui.getByRole('spinbutton', { name: /custom width/i });
    fireEvent.change(custom, { target: { value: '500' } });
    expect(frame().style.width).toBe('500px');
  });
});

describe('Canvas scroll chain', () => {
  // happy-dom can't measure real scrolling (no layout engine), so assert the
  // class contract that makes the flex column shrink and the surface scroll
  // instead of clipping under the grid's overflow-hidden. The root flex column
  // and the scroll surface both need min-h-0; the surface needs overflow-auto.
  function renderCanvas() {
    const utils = render(
      <Canvas>
        <div>preview content</div>
      </Canvas>,
    );
    const surface = () => utils.container.querySelector('[data-canvas-surface]') as HTMLElement;
    const root = () => utils.container.firstElementChild as HTMLElement;
    return { ...utils, surface, root };
  }

  it('the root flex column can shrink (min-h-0)', () => {
    const { root } = renderCanvas();
    expect(root().className).toContain('min-h-0');
    expect(root().className).toContain('flex-col');
  });

  it('the scroll surface scrolls and can shrink (overflow-auto + min-h-0)', () => {
    const { surface } = renderCanvas();
    expect(surface().className).toContain('overflow-auto');
    expect(surface().className).toContain('min-h-0');
  });
});

describe('Canvas surface toggle', () => {
  function renderCanvas() {
    const utils = render(
      <Canvas>
        <div data-testid="preview-child">preview content</div>
      </Canvas>,
    );
    const ui = within(utils.container);
    const surface = () => utils.container.querySelector('[data-canvas-surface]') as HTMLElement;
    const frame = () => utils.container.querySelector(FRAME) as HTMLElement;
    return { ...utils, ui, surface, frame };
  }

  // The canvas-surface control is labelled "Surface" (distinct from the widget
  // "Theme" toggle), so neither the group nor its options collide with Theme's
  // Light/Dark by accessible name.
  it('exposes the surface group under a "Surface" name, not "background"', () => {
    const { ui } = renderCanvas();
    expect(ui.getByRole('group', { name: /surface/i })).toBeTruthy();
    expect(ui.queryByRole('group', { name: /background/i })).toBeNull();
  });

  it('offers White / Gray / Dark / Host-sim surface options', () => {
    const { ui } = renderCanvas();
    const group = ui.getByRole('group', { name: /surface/i });
    const within_group = within(group);
    expect(within_group.getByRole('button', { name: /white/i })).toBeTruthy();
    expect(within_group.getByRole('button', { name: /gray/i })).toBeTruthy();
    expect(within_group.getByRole('button', { name: /dark/i })).toBeTruthy();
    expect(within_group.getByRole('button', { name: /host.?sim/i })).toBeTruthy();
  });

  it('selecting a surface sets the canvas surface background', () => {
    const { ui, surface } = renderCanvas();
    const group = within(ui.getByRole('group', { name: /surface/i }));

    fireEvent.click(group.getByRole('button', { name: /white/i }));
    expect(surface().style.background.toLowerCase()).toBe('#ffffff');

    fireEvent.click(group.getByRole('button', { name: /dark/i }));
    // A dark surface is distinctly not white.
    expect(surface().style.background.toLowerCase()).not.toBe('#ffffff');
    expect(surface().style.background).not.toBe('');
  });

  it('does NOT wrap children in a HostFrame unless host-sim is active', () => {
    const { ui, getByTestId } = renderCanvas();
    const group = within(ui.getByRole('group', { name: /surface/i }));
    fireEvent.click(group.getByRole('button', { name: /gray/i }));
    const child = getByTestId('preview-child');
    expect(child.closest('[data-host-frame]')).toBeNull();
  });

  it('selecting Host-sim wraps children in a HostFrame ancestor', () => {
    const { ui, getByTestId } = renderCanvas();
    const group = within(ui.getByRole('group', { name: /surface/i }));
    fireEvent.click(group.getByRole('button', { name: /host.?sim/i }));
    const child = getByTestId('preview-child');
    expect(child.closest('[data-host-frame]')).not.toBeNull();
  });

  it('keeps the width constraint working under any surface', () => {
    const { ui, frame } = renderCanvas();
    fireEvent.click(
      within(ui.getByRole('group', { name: /surface/i })).getByRole('button', { name: /dark/i }),
    );
    fireEvent.click(
      within(ui.getByRole('group', { name: /viewport/i })).getByRole('button', { name: /mobile/i }),
    );
    expect(frame().style.width).toBe('375px');
  });
});

describe('Canvas theme vs surface disambiguation', () => {
  function renderCanvas(props: Partial<Parameters<typeof Canvas>[0]> = {}) {
    const utils = render(
      <Canvas theme="light" onThemeChange={() => {}} {...props}>
        <div>preview content</div>
      </Canvas>,
    );
    const ui = within(utils.container);
    return { ...utils, ui };
  }

  // The widget Theme toggle and the canvas Surface toggle both have a "Dark"
  // option — they must be reachable by distinct group names so neither query is
  // ambiguous and the two clusters read as separate controls.
  it('exposes Theme and Surface as separate, unambiguous groups', () => {
    const { ui } = renderCanvas();
    const themeGroup = ui.getByRole('group', { name: /theme/i });
    const surfaceGroup = ui.getByRole('group', { name: /surface/i });
    expect(themeGroup).not.toBe(surfaceGroup);
    // Each "Dark" resolves within exactly one group.
    expect(within(themeGroup).getByRole('button', { name: /dark/i })).toBeTruthy();
    expect(within(surfaceGroup).getByRole('button', { name: /dark/i })).toBeTruthy();
  });
});

describe('Canvas controlled background', () => {
  function renderCanvas(props: Partial<Parameters<typeof Canvas>[0]> = {}) {
    const utils = render(
      <Canvas theme="light" onThemeChange={() => {}} {...props}>
        <div>preview content</div>
      </Canvas>,
    );
    const ui = within(utils.container);
    const surface = () => utils.container.querySelector('[data-canvas-surface]') as HTMLElement;
    return { ...utils, ui, surface };
  }

  it('reflects a controlled background prop and calls onBackgroundChange on click', () => {
    const onBackgroundChange = vi.fn();
    const { ui } = renderCanvas({ background: 'white', onBackgroundChange });
    const group = within(ui.getByRole('group', { name: /surface/i }));
    // The controlled value is reflected as the pressed option.
    expect(group.getByRole('button', { name: /white/i }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(group.getByRole('button', { name: /dark/i }));
    expect(onBackgroundChange).toHaveBeenCalledWith('dark');
  });

  it('paints the surface from the controlled background', () => {
    const { surface } = renderCanvas({ background: 'white', onBackgroundChange: () => {} });
    expect(surface().style.background.toLowerCase()).toBe('#ffffff');
  });
});

describe('Canvas controlled viewport custom-width fallback (audit #44)', () => {
  it('clearing the custom width returns to the previously selected preset, not fluid', () => {
    // Controlled harness mirroring the widget route: the parent stores the
    // viewport (URL state) and re-renders with whatever Canvas emits.
    function Controlled() {
      const [viewport, setViewport] =
        useState<NonNullable<Parameters<typeof Canvas>[0]['viewport']>>('fluid');
      return (
        <Canvas viewport={viewport} onViewportChange={setViewport}>
          <div>preview content</div>
        </Canvas>
      );
    }
    const utils = render(<Controlled />);
    const ui = within(utils.container);
    const custom = () => ui.getByRole('spinbutton', { name: /custom width/i });

    fireEvent.click(ui.getByRole('button', { name: /tablet/i }));
    fireEvent.change(custom(), { target: { value: '800' } });
    // Clearing the field must fall back to Tablet — the previously selected
    // preset — not the uncontrolled fallback's initial 'fluid'.
    fireEvent.change(custom(), { target: { value: '' } });

    const frame = utils.container.querySelector('[data-canvas-frame]') as HTMLElement;
    expect(frame.style.width).toBe('768px');
  });
});

describe('Canvas keyboard shortcuts', () => {
  function renderCanvas(props: Partial<Parameters<typeof Canvas>[0]> = {}) {
    const onViewportChange = vi.fn();
    const onThemeChange = vi.fn();
    const utils = render(
      <Canvas
        theme="light"
        onThemeChange={onThemeChange}
        viewport="fluid"
        onViewportChange={onViewportChange}
        {...props}
      >
        <div>preview content</div>
      </Canvas>,
    );
    return { ...utils, ui: within(utils.container), onViewportChange, onThemeChange };
  }

  it('1/2/3/4 select the viewport presets', () => {
    const { onViewportChange } = renderCanvas();
    fireEvent.keyDown(window, { key: '1' });
    expect(onViewportChange).toHaveBeenLastCalledWith('mobile');
    fireEvent.keyDown(window, { key: '2' });
    expect(onViewportChange).toHaveBeenLastCalledWith('tablet');
    fireEvent.keyDown(window, { key: '3' });
    expect(onViewportChange).toHaveBeenLastCalledWith('desktop');
    fireEvent.keyDown(window, { key: '4' });
    expect(onViewportChange).toHaveBeenLastCalledWith('fluid');
  });

  it('t toggles the widget theme', () => {
    const { onThemeChange } = renderCanvas({ theme: 'light' });
    fireEvent.keyDown(window, { key: 't' });
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('ignores shortcuts while a form control is focused', () => {
    const { ui, onViewportChange } = renderCanvas();
    const custom = ui.getByRole('spinbutton', { name: /custom width/i });
    custom.focus();
    fireEvent.keyDown(window, { key: '1' });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('ignores modified chords (Cmd-1 etc.) so OS/browser shortcuts pass through', () => {
    const { onViewportChange } = renderCanvas();
    fireEvent.keyDown(window, { key: '1', metaKey: true });
    expect(onViewportChange).not.toHaveBeenCalled();
  });

  it('exposes a keyboard-shortcut hint when the theme toggle is wired', () => {
    const { ui } = renderCanvas();
    expect(ui.getByLabelText(/keyboard shortcuts/i)).toBeTruthy();
  });
});
