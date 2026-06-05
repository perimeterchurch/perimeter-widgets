import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../src/providers/error-boundary';

function Boom(): React.JSX.Element {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary widgetName="x">
        <div>ok</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders a fallback when a child throws', () => {
    // Silence React's expected error log in test output.
    const original = console.error;
    console.error = () => {};
    try {
      render(
        <ErrorBoundary widgetName="x">
          <Boom />
        </ErrorBoundary>,
      );
      expect(screen.getByRole('alert')).toHaveTextContent(/error/i);
    } finally {
      console.error = original;
    }
  });

  it('does not use the old hardcoded low-contrast hex for the fallback color', () => {
    const original = console.error;
    console.error = () => {};
    try {
      render(
        <ErrorBoundary widgetName="x">
          <Boom />
        </ErrorBoundary>,
      );
      const alert = screen.getByRole('alert');
      // jsdom's CSSOM rejects `var()` in a color slot, so the resolved `color`
      // can't be read here — but we can assert the old hardcoded `#7a1a1a` (low
      // contrast in dark) is gone. The token resolution (`var(--color-destructive)`)
      // is verified for real in the Playwright harness (dark-mode readability).
      expect((alert.getAttribute('style') ?? '').toLowerCase()).not.toContain('#7a1a1a');
    } finally {
      console.error = original;
    }
  });

  it('offers a Reload affordance that clears the error and re-renders children', () => {
    const original = console.error;
    console.error = () => {};
    try {
      // First mount throws; after Reload clears the error state, the boundary
      // re-renders its (now non-throwing) children.
      let shouldThrow = true;
      function MaybeBoom(): React.JSX.Element {
        if (shouldThrow) throw new Error('boom');
        return <div>recovered</div>;
      }
      render(
        <ErrorBoundary widgetName="x">
          <MaybeBoom />
        </ErrorBoundary>,
      );
      const reload = screen.getByRole('button', { name: /reload/i });
      shouldThrow = false;
      fireEvent.click(reload);
      expect(screen.getByText('recovered')).toBeInTheDocument();
    } finally {
      console.error = original;
    }
  });
});
