import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../src/button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies the primary variant by default', () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole('button').className).toContain('bg-primary');
  });

  it('applies the secondary variant when requested', () => {
    render(<Button variant="secondary">Go</Button>);
    expect(screen.getByRole('button').className).toContain('bg-secondary');
  });

  it('applies the ghost variant when requested', () => {
    render(<Button variant="ghost">Go</Button>);
    const el = screen.getByRole('button');
    expect(el.className).not.toContain('bg-primary');
    expect(el.className).toContain('hover:bg-muted');
  });

  it('forwards arbitrary props to the underlying button', () => {
    render(
      <Button data-testid="x" disabled>
        Go
      </Button>,
    );
    expect(screen.getByTestId('x')).toBeDisabled();
  });

  it('merges custom className', () => {
    render(<Button className="custom-class">Go</Button>);
    expect(screen.getByRole('button').className).toContain('custom-class');
  });
});
