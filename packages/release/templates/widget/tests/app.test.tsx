import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app';

describe('__NAME__ widget App', () => {
  it('renders the configured title', () => {
    render(<App config={{ title: 'Hello' }} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
