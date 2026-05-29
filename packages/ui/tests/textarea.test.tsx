import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Textarea } from '../src/textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea placeholder="Notes" />);
    const el = screen.getByPlaceholderText('Notes');
    expect(el.tagName).toBe('TEXTAREA');
    expect(el.getAttribute('data-slot')).toBe('textarea');
  });

  it('merges custom className', () => {
    render(<Textarea aria-label="ta" className="custom-class" />);
    expect(screen.getByLabelText('ta').className).toContain('custom-class');
  });
});
