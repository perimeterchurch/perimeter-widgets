// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { globalTokens } from '@perimeter/theme';
import { ThemeEditor } from './ThemeEditor';

// The theme editor pairs each color token with a native <input type="color">
// swatch and a text input that both write the same override key. happy-dom has
// no real layout; assert structure + that change handlers fire onChange with the
// token. No global RTL cleanup — unmount each render.

describe('ThemeEditor color picker', () => {
  afterEach(cleanup);

  it('renders a native color input for every color token', () => {
    const { container } = render(<ThemeEditor overrides={{}} onChange={() => {}} />);
    const colorTokens = (Object.keys(globalTokens) as (keyof typeof globalTokens)[]).filter((k) =>
      k.startsWith('color-'),
    );
    for (const token of colorTokens) {
      const picker = container.querySelector(`input[type="color"][data-color-token="${token}"]`);
      expect(picker).toBeTruthy();
    }
  });

  it('does not render a color input for non-color tokens', () => {
    const { container } = render(<ThemeEditor overrides={{}} onChange={() => {}} />);
    expect(container.querySelector('input[type="color"][data-color-token="radius-sm"]')).toBeNull();
    expect(container.querySelector('input[type="color"][data-color-token="font-sans"]')).toBeNull();
  });

  it('writes the override for the token when the color picker changes', () => {
    const onChange = vi.fn();
    const { container } = render(<ThemeEditor overrides={{}} onChange={onChange} />);
    const picker = container.querySelector(
      'input[type="color"][data-color-token="color-primary"]',
    ) as HTMLInputElement;
    expect(picker).toBeTruthy();

    fireEvent.input(picker, { target: { value: '#ff0000' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Record<string, string>;
    expect(next['color-primary']).toBe('#ff0000');
  });

  it('keeps the text input writing the same override key', () => {
    const onChange = vi.fn();
    const { container } = render(<ThemeEditor overrides={{}} onChange={onChange} />);
    const text = container.querySelector(
      'input[data-text-token="color-primary"]',
    ) as HTMLInputElement;
    expect(text).toBeTruthy();

    fireEvent.change(text, { target: { value: 'hsl(0 100% 50%)' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Record<string, string>;
    expect(next['color-primary']).toBe('hsl(0 100% 50%)');
  });
});
