// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Breadcrumbs } from './Breadcrumbs';

// The studio suite has no global RTL auto-cleanup; scope to each render's container
// and unmount between tests.
afterEach(cleanup);

describe('Breadcrumbs', () => {
  it('renders earlier crumbs as links and the final crumb as the current page', () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumbs
          crumbs={[
            { label: 'Home', to: '/' },
            { label: 'Widgets', to: '/widgets/sermons' },
            { label: 'Sermons' },
          ]}
        />
      </MemoryRouter>,
    );
    const ui = within(container);

    // Home is a link to the overview.
    const home = ui.getByRole('link', { name: 'Home' });
    expect(home.getAttribute('href')).toBe('/');

    // The final crumb is plain text marked as the current page — not a link.
    expect(ui.queryByRole('link', { name: 'Sermons' })).toBeNull();
    const current = ui.getByText('Sermons');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('exposes a labelled breadcrumb landmark', () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumbs crumbs={[{ label: 'Home', to: '/' }, { label: 'Tokens' }]} />
      </MemoryRouter>,
    );
    expect(within(container).getByRole('navigation', { name: /breadcrumb/i })).toBeTruthy();
  });
});
