/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../src/app';
import { LatestSermonConfigSchema, type LatestSermonConfig } from '../src/types';

/** Minimal UseQueryResult-shaped object wrapping the API envelope. */
function queryResult(envelope: unknown, overrides: Record<string, unknown> = {}) {
  return {
    data: envelope,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    ...overrides,
  };
}

const SERMON = {
  id: 5592,
  title: 'Work on Purpose',
  subtitle: null,
  shortDescription:
    'Our lives should be described as label before labor, purpose before passion, and Christ before all.',
  date: '2026-06-14',
  bannerUrl: null,
  speaker: { id: 156, name: 'Dr. Bryan Chapell', bio: null },
  series: { id: 1355, title: 'Work in Progress' },
  congregation: { id: 1 },
  book: { id: 51, name: 'Colossians' },
};

// The App pulls live data through @perimeter/api-hooks, which needs an
// ApiClient context the test doesn't provide. Mock the hook so the tree
// renders deterministically against a known latest sermon.
const hooks = vi.hoisted<{ sermonsResult: unknown }>(() => ({
  sermonsResult: undefined,
}));

vi.mock('@perimeter/api-hooks', () => ({
  useSermons: () => hooks.sermonsResult,
}));

function renderApp(overrides: Record<string, unknown> = {}) {
  const config: LatestSermonConfig = LatestSermonConfigSchema.parse(overrides);
  return render(<App config={config} />);
}

describe('latest-sermon App', () => {
  it('renders the latest sermon title, series, and date', () => {
    hooks.sermonsResult = queryResult({ success: true, data: { sermons: [SERMON] } });
    renderApp();
    expect(screen.getByText('Work on Purpose')).toBeInTheDocument();
    expect(screen.getByText('Work in Progress')).toBeInTheDocument();
    expect(screen.getByText('Jun 14, 2026')).toBeInTheDocument();
  });

  it('does not render the short description', () => {
    hooks.sermonsResult = queryResult({ success: true, data: { sermons: [SERMON] } });
    renderApp();
    expect(screen.queryByText(/label before labor/)).toBeNull();
  });

  it('links the Play button to the sermon-details page by ID', () => {
    hooks.sermonsResult = queryResult({ success: true, data: { sermons: [SERMON] } });
    renderApp();
    const link = screen.getByRole('link', { name: /play/i });
    expect(link).toHaveAttribute(
      'href',
      'https://www.perimeter.org/sermons/sermon-details/?id=5592',
    );
  });

  it('shows an empty state when there is no sermon', () => {
    hooks.sermonsResult = queryResult({ success: true, data: { sermons: [] } });
    renderApp();
    expect(screen.getByText(/no sermons available/i)).toBeInTheDocument();
  });

  it('shows a loading state while fetching', () => {
    hooks.sermonsResult = queryResult(undefined, { isLoading: true, isSuccess: false });
    const { container } = renderApp();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});
