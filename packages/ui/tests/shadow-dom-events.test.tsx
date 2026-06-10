/**
 * Shadow-DOM event handling (audit #14/#30). Production widgets render inside
 * an open shadow root (widget-runtime mount.tsx), where two event-model facts
 * break naive listeners:
 *   1. events originating OUTSIDE the shadow tree never propagate into the
 *      shadow root — a shadow-root listener is blind to host-page clicks;
 *   2. events originating INSIDE the shadow tree retarget to the shadow HOST
 *      for document/window-level listeners — `event.target` containment
 *      checks against in-shadow elements can never match.
 * These tests mount components inside a real shadow root and pin both sides.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useRef, type ReactElement } from 'react';
import { render, within, fireEvent, act } from '@testing-library/react';
import { MultiCombobox } from '../src/multi-combobox';
import { useClickOutside } from '../src/hooks/use-click-outside';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

/** Render `ui` inside an open shadow root attached to a host in the body. */
function renderInShadow(ui: ReactElement) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.appendChild(container);
  render(ui, { container });
  return { shadow, container, queries: within(container) };
}

function composedMouseEvent(type: string) {
  return new MouseEvent(type, { bubbles: true, composed: true, cancelable: true });
}

function Harness({ onOutside }: { onOutside: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onOutside, true);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        inside
      </div>
      <button data-testid="in-shadow-outside">in-shadow outside</button>
    </div>
  );
}

describe('useClickOutside inside a shadow root', () => {
  it('fires for clicks on the host page (outside the shadow tree)', () => {
    const onOutside = vi.fn();
    renderInShadow(<Harness onOutside={onOutside} />);

    act(() => {
      document.body.dispatchEvent(composedMouseEvent('mousedown'));
    });

    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not fire for in-shadow clicks inside the ref (composed target resolved through the boundary)', () => {
    const onOutside = vi.fn();
    const { queries } = renderInShadow(<Harness onOutside={onOutside} />);

    act(() => {
      queries.getByTestId('inside').dispatchEvent(composedMouseEvent('mousedown'));
    });

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('fires for in-shadow clicks outside the ref', () => {
    const onOutside = vi.fn();
    const { queries } = renderInShadow(<Harness onOutside={onOutside} />);

    act(() => {
      queries.getByTestId('in-shadow-outside').dispatchEvent(composedMouseEvent('mousedown'));
    });

    expect(onOutside).toHaveBeenCalledTimes(1);
  });
});

describe('MultiCombobox inside a shadow root', () => {
  const options = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ];

  it('keeps the menu open across an in-widget mouseup (downshift blur tracker sees the composed target)', () => {
    const { queries } = renderInShadow(
      <MultiCombobox multiple options={options} placeholder="Pick fruit" />,
    );

    // Open the menu via the toggle, then release the mouse over a menu item —
    // the press/release cycle downshift's window-level tracker observes.
    fireEvent.click(queries.getByRole('button', { name: 'toggle menu' }));
    expect(queries.getByRole('listbox').children.length).toBeGreaterThan(0);

    act(() => {
      queries.getByText('Apple').dispatchEvent(composedMouseEvent('mouseup'));
    });

    // Without composed-path retargeting the mouseup is classified as an
    // outside click (target = shadow host) and downshift closes the menu.
    expect(queries.getByRole('listbox').children.length).toBeGreaterThan(0);
  });

  it('closes the menu on a genuine host-page mouseup', () => {
    const { queries } = renderInShadow(
      <MultiCombobox multiple options={options} placeholder="Pick fruit" />,
    );

    fireEvent.click(queries.getByRole('button', { name: 'toggle menu' }));
    expect(queries.getByRole('listbox').children.length).toBeGreaterThan(0);

    // Move focus off the widget first: downshift also treats "activeElement
    // within the widget" as inside, and jsdom (unlike a real browser) does not
    // retarget document.activeElement to the shadow host.
    (document.activeElement as HTMLElement | null)?.blur();
    // Full press/release — downshift's tracker arms on mousedown.
    act(() => {
      document.body.dispatchEvent(composedMouseEvent('mousedown'));
      document.body.dispatchEvent(composedMouseEvent('mouseup'));
    });

    expect(queries.getByRole('listbox').children.length).toBe(0);
  });
});
