import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../src/skeleton';

describe('Skeleton', () => {
  it('renders a placeholder div', () => {
    render(<Skeleton data-testid="s" />);
    const el = screen.getByTestId('s');
    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-muted');
  });

  it('merges custom className', () => {
    render(<Skeleton data-testid="s" className="h-10 w-20" />);
    expect(screen.getByTestId('s').className).toContain('h-10');
  });
});
