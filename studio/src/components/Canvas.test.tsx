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
