import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../src/label';

describe('Label', () => {
  it('renders children as a label', () => {
    render(<Label htmlFor="x">Name</Label>);
    const el = screen.getByText('Name');
    expect(el.tagName).toBe('LABEL');
    expect(el.getAttribute('for')).toBe('x');
  });

  it('applies typography classes', () => {
    render(<Label>Name</Label>);
    expect(screen.getByText('Name').className).toContain('text-sm');
  });
});
