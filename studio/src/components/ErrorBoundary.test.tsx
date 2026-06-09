// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// A throwing page/MDX doc previously white-screened the whole SPA. The boundary
// must catch it at runtime and render a recover UI — typecheck/build can't see this.

afterEach(cleanup);

function Boom(): never {
  throw new Error('mdx blew up');
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>healthy-child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy-child')).toBeTruthy();
  });

  it('catches a throwing child and shows the recover fallback (no crash)', () => {
    // React logs the caught error to console.error; silence it for a clean run.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    // Fallback is present…
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    // …surfaces the error message and offers recovery affordances.
    expect(alert.textContent).toContain('mdx blew up');
    expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /go home/i })).toBeTruthy();
    spy.mockRestore();
  });
});
