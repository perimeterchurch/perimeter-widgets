/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../../src/components/ui/Modal';

describe('Modal focus trap loop', () => {
  // jsdom does not run native Tab traversal, so assert the hand-rolled loop logic:
  // Tab on the last focusable wraps to the first; Shift+Tab on the first wraps to the last.
  it('wraps focus from last focusable to first on Tab', () => {
    render(
      <Modal open onClose={() => {}}>
        <button type="button">first</button>
        <button type="button">last</button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const first = screen.getByText('first');
    const last = screen.getByText('last');
    const firstFocus = vi.spyOn(first, 'focus');

    // Simulate being on the last focusable and pressing Tab.
    last.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(firstFocus).toHaveBeenCalled();
  });

  it('wraps focus from first focusable to last on Shift+Tab', () => {
    render(
      <Modal open onClose={() => {}}>
        <button type="button">first</button>
        <button type="button">last</button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const first = screen.getByText('first');
    const last = screen.getByText('last');
    const lastFocus = vi.spyOn(last, 'focus');

    first.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(lastFocus).toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <button type="button">first</button>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
