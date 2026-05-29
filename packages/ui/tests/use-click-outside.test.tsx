import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useClickOutside } from '../src/hooks/use-click-outside';

function Harness({ onOutside }: { onOutside: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onOutside, true);
  return (
    <div>
      <div ref={ref} data-testid="inside">
        inside
      </div>
      <button data-testid="outside">outside</button>
    </div>
  );
}

describe('useClickOutside', () => {
  it('fires when clicking outside the ref', () => {
    const onOutside = vi.fn();
    render(<Harness onOutside={onOutside} />);
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('does not fire when clicking inside the ref', () => {
    const onOutside = vi.fn();
    render(<Harness onOutside={onOutside} />);
    fireEvent.mouseDown(screen.getByTestId('inside'));
    expect(onOutside).not.toHaveBeenCalled();
  });
});
