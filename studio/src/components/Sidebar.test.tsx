// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, within, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Sidebar } from './Sidebar';
import type { NavGroup } from '../lib/nav';

// The studio suite has no global RTL auto-cleanup; scope queries to each render's
// own container and unmount between tests so renders don't leak.
afterEach(cleanup);

const fixtureNav: NavGroup[] = [
  {
    label: 'Widgets',
    items: [
      { to: '/widgets/sermons', label: 'sermons' },
      { to: '/widgets/example', label: 'example' },
    ],
  },
  {
    label: 'Components',
    items: [{ to: '/components/button', label: 'button' }],
  },
  {
    label: 'Reference',
    items: [{ to: '/tokens', label: 'Tokens' }],
  },
];

describe('Sidebar', () => {
  it('renders each group label', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar nav={fixtureNav} />
      </MemoryRouter>,
    );
    const ui = within(container);
    expect(ui.getByText('Widgets')).toBeTruthy();
    expect(ui.getByText('Components')).toBeTruthy();
    expect(ui.getByText('Reference')).toBeTruthy();
  });

  it('filters items as you type in the search box (case-insensitive)', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar nav={fixtureNav} />
      </MemoryRouter>,
    );
    const ui = within(container);
    const search = ui.getByRole('searchbox');

    fireEvent.change(search, { target: { value: 'serm' } });

    expect(ui.getByRole('link', { name: 'sermons' })).toBeTruthy();
    expect(ui.queryByRole('link', { name: 'example' })).toBeNull();
    expect(ui.queryByRole('link', { name: 'button' })).toBeNull();
  });

  it('shows an empty state when nothing matches the filter', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar nav={fixtureNav} />
      </MemoryRouter>,
    );
    const ui = within(container);
    fireEvent.change(ui.getByRole('searchbox'), { target: { value: 'zzz-nomatch' } });
    expect(ui.getByText(/no matches/i)).toBeTruthy();
  });

  it('marks the link for the current route active via aria-current="page"', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/widgets/sermons']}>
        <Sidebar nav={fixtureNav} />
      </MemoryRouter>,
    );
    const ui = within(container);
    const active = ui.getByRole('link', { name: 'sermons' });
    expect(active.getAttribute('aria-current')).toBe('page');
    // A non-active link must not carry the marker.
    const inactive = ui.getByRole('link', { name: 'example' });
    expect(inactive.getAttribute('aria-current')).toBeNull();
  });
});
