// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
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
        <Sidebar nav={fixtureNav} open={false} onOpenChange={() => {}} />
      </MemoryRouter>,
    );
    const ui = within(container);
    expect(ui.getByText('Widgets')).toBeTruthy();
    expect(ui.getByText('Components')).toBeTruthy();
    expect(ui.getByText('Reference')).toBeTruthy();
  });

  it('shows a sign-in-required lock only on auth-flagged items', () => {
    const nav: NavGroup[] = [
      {
        label: 'Catalog',
        items: [
          { to: '/catalog/my-shepherds', label: 'My Shepherds', authRequired: true },
          { to: '/catalog/sermons', label: 'Sermons', authRequired: false },
        ],
      },
    ];
    const { container } = render(
      <MemoryRouter>
        <Sidebar nav={nav} open={false} onOpenChange={() => {}} />
      </MemoryRouter>,
    );
    const ui = within(container);
    const locked = ui.getByRole('link', { name: /my shepherds/i });
    expect(within(locked).getByText('Sign-in required')).toBeTruthy();
    const open = ui.getByRole('link', { name: 'Sermons' });
    expect(within(open).queryByText('Sign-in required')).toBeNull();
  });

  it('marks the link for the current route active via aria-current="page"', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/widgets/sermons']}>
        <Sidebar nav={fixtureNav} open={false} onOpenChange={() => {}} />
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
