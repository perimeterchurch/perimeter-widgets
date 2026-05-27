import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonTransition } from '../src/skeleton-transition';

describe('SkeletonTransition', () => {
  it('renders the skeleton while loading', () => {
    render(
      <SkeletonTransition isLoading skeleton={<span>loading</span>}>
        <span>content</span>
      </SkeletonTransition>,
    );
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('renders the content when not loading', () => {
    render(
      <SkeletonTransition isLoading={false} skeleton={<span>loading</span>}>
        <span>content</span>
      </SkeletonTransition>,
    );
    expect(screen.getByText('content')).toBeInTheDocument();
  });
});
