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
});
