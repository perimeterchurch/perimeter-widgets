import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { render } from '@testing-library/react';
import { useClickOutside } from '../use-click-outside';

function Probe({
    onOutside,
    enabled,
}: {
    onOutside: () => void;
    enabled?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, onOutside, enabled);
    return (
        <div data-testid='outer'>
            <div ref={ref} data-testid='inside'>
                inside
            </div>
            <div data-testid='outside'>outside</div>
        </div>
    );
}

function fireMouseDown(target: Element) {
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
}

describe('useClickOutside', () => {
    it('fires when mousedown lands outside the ref', () => {
        const onOutside = vi.fn();
        const { getByTestId } = render(<Probe onOutside={onOutside} />);
        fireMouseDown(getByTestId('outside'));
        expect(onOutside).toHaveBeenCalledTimes(1);
    });

    it('does not fire when mousedown lands inside the ref', () => {
        const onOutside = vi.fn();
        const { getByTestId } = render(<Probe onOutside={onOutside} />);
        fireMouseDown(getByTestId('inside'));
        expect(onOutside).not.toHaveBeenCalled();
    });

    it('is inert when disabled', () => {
        const onOutside = vi.fn();
        const { getByTestId } = render(
            <Probe onOutside={onOutside} enabled={false} />,
        );
        fireMouseDown(getByTestId('outside'));
        expect(onOutside).not.toHaveBeenCalled();
    });
});
