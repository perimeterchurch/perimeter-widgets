import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '../src/empty';

describe('Empty', () => {
  it('renders the composed empty state', () => {
    render(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Nothing here</EmptyTitle>
          <EmptyDescription>Try a different filter</EmptyDescription>
        </EmptyHeader>
      </Empty>,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Try a different filter')).toBeInTheDocument();
  });

  it('sets the empty data-slot on the root', () => {
    const { container } = render(<Empty />);
    expect(container.querySelector('[data-slot="empty"]')).not.toBeNull();
  });

  it('declares a full dashed border so the outline actually renders', () => {
    const { container } = render(<Empty />);
    const root = container.querySelector('[data-slot="empty"]');
    // `border-dashed` alone draws nothing (no width/color); the visible empty-state
    // outline needs `border` width + `border-border` color too.
    expect(root?.className).toContain('border');
    expect(root?.className).toContain('border-dashed');
    expect(root?.className).toContain('border-border');
  });
});
