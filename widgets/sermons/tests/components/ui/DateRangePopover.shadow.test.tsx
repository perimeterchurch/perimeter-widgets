/// <reference types="@testing-library/jest-dom/vitest" />
/**
 * Focus-trap inside a shadow root (audit #28). In production the popover
 * renders inside the widget's shadow root, where `document.activeElement`
 * retargets to the shadow HOST — so a trap comparing it to in-shadow
 * first/last elements never matches and Tab walks out of the aria-modal
 * dialog. The trap must resolve the active element through
 * `panel.getRootNode().activeElement` instead.
 *
 * jsdom caveat: jsdom does not retarget `document.activeElement` the way
 * browsers do, so this test cannot prove the OLD code broken — it pins that
 * the NEW root-resolved lookup works inside a shadow tree (and would catch a
 * regression to any lookup that fails there).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { DateRangePopover } from '../../../src/components/ui/date-range/DateRangePopover';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function renderInShadow(ui: ReactElement) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const container = document.createElement('div');
  shadow.appendChild(container);
  render(ui, { container });
  return { shadow, queries: within(container) };
}

describe('DateRangePopover focus trap inside a shadow root', () => {
  it('wraps Tab from the last focusable back to the first', () => {
    const { queries } = renderInShadow(
      <DateRangePopover open onClose={() => {}}>
        <button>first</button>
        <button>last</button>
      </DateRangePopover>,
    );

    const dialog = queries.getByRole('dialog');
    const first = queries.getByRole('button', { name: 'first' });
    const last = queries.getByRole('button', { name: 'last' });

    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });

    expect((dialog.getRootNode() as ShadowRoot).activeElement).toBe(first);
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    const { queries } = renderInShadow(
      <DateRangePopover open onClose={() => {}}>
        <button>first</button>
        <button>last</button>
      </DateRangePopover>,
    );

    const dialog = queries.getByRole('dialog');
    const first = queries.getByRole('button', { name: 'first' });
    const last = queries.getByRole('button', { name: 'last' });

    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

    expect((dialog.getRootNode() as ShadowRoot).activeElement).toBe(last);
  });

  // Escape listens on the panel (not `document`), so a host-page keydown
  // handler that stops propagation cannot swallow it. The focus trap keeps
  // focus inside the panel, so the panel always sees the keydown.
  it('closes on Escape pressed inside the panel', () => {
    const onClose = vi.fn();
    const { queries } = renderInShadow(
      <DateRangePopover open onClose={onClose}>
        <button>only</button>
      </DateRangePopover>,
    );

    fireEvent.keyDown(queries.getByRole('button', { name: 'only' }), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
