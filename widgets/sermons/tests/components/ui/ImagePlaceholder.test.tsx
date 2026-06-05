/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ImagePlaceholder } from '../../../src/components/ui/ImagePlaceholder';

describe('ImagePlaceholder', () => {
  it('renders an inline SVG mark, not a remote WordPress logo URL', () => {
    const { container } = render(<ImagePlaceholder />);
    // No dependency on the perimeter.org WP uploads URL.
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('wp-content');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('themes via design tokens so it adapts to dark mode', () => {
    const { container } = render(<ImagePlaceholder />);
    const html = container.innerHTML;
    // The mark reads a token (currentColor / muted-fg) rather than a fixed color.
    expect(html).toMatch(/currentColor|muted-fg/);
    // No hardcoded gray-family palette on the wrapper chrome.
    expect(html).not.toMatch(/\b(?:bg|text|border)-(?:gray|slate|zinc|neutral|stone)-\d/);
  });
});
