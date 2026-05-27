import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../src/badge';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('applies the default variant classes', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New').className).toContain('bg-primary');
  });

  it('merges custom className', () => {
    render(<Badge className="custom-class">New</Badge>);
    expect(screen.getByText('New').className).toContain('custom-class');
  });
});
