// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';
import { CollapsibleFilters } from '../../../src/components/ui/CollapsibleFilters';

const body = <div data-testid="body">filters</div>;

describe('CollapsibleFilters', () => {
  it('tablet/desktop: no toggle, body always visible', () => {
    const { container } = render(
      <CollapsibleFilters
        breakpoint="tablet"
        activeFilterCount={0}
        hasActive={false}
        onClear={vi.fn()}
      >
        {body}
      </CollapsibleFilters>,
    );
    expect(within(container).queryByRole('button', { name: /filters/i })).toBeNull();
    expect(within(container).getByTestId('body')).toBeTruthy();
  });
  it('phone: body hidden until the Filters toggle is pressed', () => {
    const { container } = render(
      <CollapsibleFilters
        breakpoint="phone"
        activeFilterCount={0}
        hasActive={false}
        onClear={vi.fn()}
      >
        {body}
      </CollapsibleFilters>,
    );
    const scope = within(container);
    expect(scope.queryByTestId('body')).toBeNull();
    fireEvent.click(scope.getByRole('button', { name: /filters/i }));
    expect(scope.getByTestId('body')).toBeTruthy();
  });
  it('phone: toggle shows the active-filter count badge', () => {
    const { container } = render(
      <CollapsibleFilters breakpoint="phone" activeFilterCount={2} hasActive onClear={vi.fn()}>
        {body}
      </CollapsibleFilters>,
    );
    expect(within(container).getByText('2')).toBeTruthy();
  });
  it('phone: Clear calls onClear and is hidden when nothing active', () => {
    const onClear = vi.fn();
    const { container, rerender } = render(
      <CollapsibleFilters
        breakpoint="phone"
        activeFilterCount={0}
        hasActive={false}
        onClear={onClear}
      >
        {body}
      </CollapsibleFilters>,
    );
    expect(within(container).queryByRole('button', { name: /clear/i })).toBeNull();
    rerender(
      <CollapsibleFilters breakpoint="phone" activeFilterCount={1} hasActive onClear={onClear}>
        {body}
      </CollapsibleFilters>,
    );
    fireEvent.click(within(container).getByRole('button', { name: /clear/i }));
    expect(onClear).toHaveBeenCalled();
  });
});
