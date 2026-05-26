import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app';

describe('Example widget App', () => {
  it('renders one card per count with the greeting as title', () => {
    render(<App config={{ greeting: 'Hi', count: 3 }} />);
    const titles = screen.getAllByRole('heading', { level: 3 });
    expect(titles).toHaveLength(3);
    for (const t of titles) expect(t.textContent).toBe('Hi');
  });

  it('renders zero cards when count is 0', () => {
    render(<App config={{ greeting: 'Hi', count: 0 }} />);
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
  });
});
