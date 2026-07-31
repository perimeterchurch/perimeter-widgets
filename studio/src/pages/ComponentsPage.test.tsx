// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ComponentsPage } from './ComponentsPage';

// This suite has no global RTL auto-cleanup; unmount between tests.
afterEach(cleanup);

// Asserts against the REAL packages/ui/src/*.tsx glob — the same discovery the
// page ships with, no mocking. Names are spot-checked rather than enumerated so
// adding a component does not break the test.

function renderPage() {
  const utils = render(
    <MemoryRouter>
      <ComponentsPage />
    </MemoryRouter>,
  );
  return { ...utils, ui: within(utils.container) };
}

describe('ComponentsPage (/components)', () => {
  it('lists discovered components as links to their doc pages', () => {
    const { ui } = renderPage();
    const button = ui.getByRole('link', { name: 'button' });
    expect(button.getAttribute('href')).toBe('/components/button');
    expect(ui.getByRole('link', { name: 'card' }).getAttribute('href')).toBe('/components/card');
  });

  it('lists the whole library, not a truncated slice', () => {
    // 18 components at the time of writing. A floor rather than an exact count so
    // adding one does not break the test, but high enough that a regression to a
    // truncated list — which would otherwise look perfectly fine — fails here.
    const { container } = renderPage();
    const links = [...container.querySelectorAll('a[href^="/components/"]')];
    expect(links.length).toBeGreaterThanOrEqual(18);
  });

  it('reports the count alongside the heading', () => {
    const { container, ui } = renderPage();
    const links = container.querySelectorAll('a[href^="/components/"]').length;
    expect(ui.getByText(`(${links})`)).toBeTruthy();
  });

  it('carries a breadcrumb trail and owns the page heading', () => {
    const { container, ui } = renderPage();
    expect(container.querySelector('h1')?.textContent).toBe('Components');
    const crumbs = ui.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(crumbs).getByRole('link', { name: 'Home' })).toBeTruthy();
    expect(within(crumbs).getByText('Components').getAttribute('aria-current')).toBe('page');
  });
});
