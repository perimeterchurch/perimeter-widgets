// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { mdxComponents, StudioMDXProvider, Example } from './mdx';
import { ComponentStage } from '../components/ComponentStage';

// This suite has no global RTL auto-cleanup; unmount renders so they don't leak.
afterEach(cleanup);

describe('mdxComponents map', () => {
  it('maps the base MDX elements authors rely on', () => {
    for (const tag of ['h1', 'h2', 'h3', 'p', 'ul', 'li', 'code', 'pre', 'a', 'table'] as const) {
      // Each is either a styled function component or an intrinsic-wrapping function.
      expect(typeof mdxComponents[tag]).toBe('function');
    }
  });

  it('exposes the live-doc building blocks (ComponentStage + Example)', () => {
    // Re-exported so .mdx files can mount real, parity-correct examples.
    expect(mdxComponents.ComponentStage).toBe(ComponentStage);
    expect(typeof mdxComponents.Example).toBe('function');
    expect(mdxComponents.Example).toBe(Example);
  });
});

describe('StudioMDXProvider', () => {
  it('renders children and applies the styled heading mapping to a mapped element', () => {
    const H1 = mdxComponents.h1 as React.ComponentType<{ children?: React.ReactNode }>;
    const { container } = render(
      <StudioMDXProvider>
        <H1>Hello docs</H1>
      </StudioMDXProvider>,
    );
    const heading = container.querySelector('h1');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toBe('Hello docs');
    // The studio styles its headings — not a bare default <h1>.
    expect(heading?.className).not.toBe('');
  });
});
