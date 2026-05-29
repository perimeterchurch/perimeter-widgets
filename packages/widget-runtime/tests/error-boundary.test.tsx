import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
