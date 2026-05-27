import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '../src/spinner';

describe('Spinner', () => {
  it('renders a status role with an accessible label', () => {
    render(<Spinner />);
    const el = screen.getByRole('status', { name: 'Loading' });
    expect(el).toBeInTheDocument();
    expect(el.getAttribute('class')).toContain('animate-spin');
  });

  it('merges custom className', () => {
    render(<Spinner className="size-8" />);
    expect(screen.getByRole('status').getAttribute('class')).toContain('size-8');
  });
});
