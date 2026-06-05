// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { OverviewPage } from './OverviewPage';

// Render-path guard for the overview directory. Discovery globs resolve against repo
// root in tests the same way they do in the dev server, so this asserts against the
// REAL seed widgets/components. No global RTL auto-cleanup — unmount between tests.
afterEach(cleanup);

describe('OverviewPage', () => {
  it('enriches each widget card with a prettified title and the slug code', () => {
    const { container } = render(
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>,
    );
    const ui = within(container);

    // The seed `sermons` widget links to its route under a human title (not the
    // bare slug), with the slug still shown as secondary code.
    const link = ui.getByRole('link', { name: /sermons/i });
    expect(link.getAttribute('href')).toBe('/widgets/sermons');
    // Title Case label derived from the slug.
    expect(within(link).getByText('Sermons')).toBeTruthy();
    // Raw slug retained as a code reference.
    expect(within(link).getByText('sermons')).toBeTruthy();
  });
});
