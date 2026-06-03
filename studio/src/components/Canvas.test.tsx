// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
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

describe('Canvas background toggle', () => {
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

  it('offers White / Gray / Dark / Host-sim background options', () => {
    const { ui } = renderCanvas();
    const group = ui.getByRole('group', { name: /background/i });
    const within_group = within(group);
    expect(within_group.getByRole('button', { name: /white/i })).toBeTruthy();
    expect(within_group.getByRole('button', { name: /gray/i })).toBeTruthy();
    expect(within_group.getByRole('button', { name: /dark/i })).toBeTruthy();
    expect(within_group.getByRole('button', { name: /host.?sim/i })).toBeTruthy();
  });

  it('selecting a background sets the canvas surface background', () => {
    const { ui, surface } = renderCanvas();
    const group = within(ui.getByRole('group', { name: /background/i }));

    fireEvent.click(group.getByRole('button', { name: /white/i }));
    expect(surface().style.background.toLowerCase()).toBe('#ffffff');

    fireEvent.click(group.getByRole('button', { name: /dark/i }));
    // A dark surface is distinctly not white.
    expect(surface().style.background.toLowerCase()).not.toBe('#ffffff');
    expect(surface().style.background).not.toBe('');
  });

  it('does NOT wrap children in a HostFrame unless host-sim is active', () => {
    const { ui, getByTestId } = renderCanvas();
    const group = within(ui.getByRole('group', { name: /background/i }));
    fireEvent.click(group.getByRole('button', { name: /gray/i }));
    const child = getByTestId('preview-child');
    expect(child.closest('[data-host-frame]')).toBeNull();
  });

  it('selecting Host-sim wraps children in a HostFrame ancestor', () => {
    const { ui, getByTestId } = renderCanvas();
    const group = within(ui.getByRole('group', { name: /background/i }));
    fireEvent.click(group.getByRole('button', { name: /host.?sim/i }));
    const child = getByTestId('preview-child');
    expect(child.closest('[data-host-frame]')).not.toBeNull();
  });

  it('keeps the width constraint working under any background', () => {
    const { ui, frame } = renderCanvas();
    fireEvent.click(
      within(ui.getByRole('group', { name: /background/i })).getByRole('button', { name: /dark/i }),
    );
    fireEvent.click(
      within(ui.getByRole('group', { name: /viewport/i })).getByRole('button', { name: /mobile/i }),
    );
    expect(frame().style.width).toBe('375px');
  });
});
