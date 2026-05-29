import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../src/input';

describe('Input', () => {
  it('renders an <input>', () => {
    render(<Input placeholder="name" />);
    expect(screen.getByPlaceholderText('name')).toBeInstanceOf(HTMLInputElement);
  });

  it('forwards type', () => {
    render(<Input type="email" placeholder="email" />);
    const el = screen.getByPlaceholderText<HTMLInputElement>('email');
    expect(el.type).toBe('email');
  });

  it('applies border + ring classes', () => {
    render(<Input data-testid="i" />);
    const el = screen.getByTestId('i');
    expect(el.className).toContain('border-border');
    expect(el.className).toContain('focus-visible:ring-ring');
  });
});
