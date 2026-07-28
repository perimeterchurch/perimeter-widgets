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

  it('fills the warning variant solidly, so it stays legible over imagery', () => {
    render(<Badge variant="warning">Registration Full</Badge>);
    // Split into classes so the assertion sees the unprefixed base utility and
    // ignores state variants like `[a]:hover:bg-warning/80`.
    const classes = screen.getByText('Registration Full').className.split(/\s+/);
    expect(classes).toContain('text-warning-fg');
    // Opaque `bg-warning`, not an alpha-tinted `bg-warning/10` like the
    // `destructive` treatment — a tint lets a photo through behind the label.
    expect(classes).toContain('bg-warning');
  });
});
