// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ComponentPage } from './ComponentPage';

// Render-path regression guard for the component route. typecheck/build pass even
// when the page crashes at runtime, so exercise the actual render through the
// router (so useParams resolves :name). Asserts against the REAL seed docs under
// docs/components/*.mdx (the glob resolves against repo root in tests the same way
// it does in the dev server) — one consistent strategy, no mocking.

describe('ComponentPage (/components/:name)', () => {
  // This suite has no global RTL auto-cleanup; unmount our render so the lazily
  // loaded MDX / mounted stage host does not leak into later tests.
  afterEach(cleanup);

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/components/:name" element={<ComponentPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the MDX doc for a component that has one (button)', async () => {
    const { container } = renderAt('/components/button');
    const scope = within(container);

    // Text unique to docs/components/button.mdx — proves the real MDX chunk
    // lazy-loaded and rendered (not the gallery, which shows export names only).
    await waitFor(() => {
      expect(scope.getByText(/A clickable action\./)).toBeTruthy();
    });
    // The doc owns the page heading: the MDX `# Button` maps to the single
    // studio-styled h1 (no redundant chrome header above it).
    expect(container.querySelector('h1')?.textContent).toBe('Button');
  });

  it('renders the input doc with a live Example (no unmapped-component throw)', async () => {
    const { container } = renderAt('/components/input');
    const scope = within(container);

    // Text unique to docs/components/input.mdx — proves the MDX chunk rendered.
    await waitFor(() => {
      expect(scope.getByText(/A single-line text field\./)).toBeTruthy();
    });
    // The doc owns the page heading.
    expect(container.querySelector('h1')?.textContent).toBe('Input');
    // The <Example> mounts a ComponentStage shadow root — its presence proves the
    // bare-JSX Input resolved from the scope map (an unmapped component would have
    // thrown "Expected component `Input` to be defined" instead of rendering).
    const hosts = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
      (el) => el.shadowRoot,
    );
    expect(hosts.length).toBeGreaterThan(0);
  });

  it('renders the tabs doc with a live Example (no unmapped-component throw)', async () => {
    const { container } = renderAt('/components/tabs');
    const scope = within(container);

    await waitFor(() => {
      expect(scope.getByText(/A set of layered sections/)).toBeTruthy();
    });
    expect(container.querySelector('h1')?.textContent).toBe('Tabs');
    const hosts = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
      (el) => el.shadowRoot,
    );
    expect(hosts.length).toBeGreaterThan(0);
  });

  it('falls back to the auto gallery for a component without a doc (spinner)', async () => {
    const { container } = renderAt('/components/spinner');

    // The gallery mounts the discovered exports inside a ComponentStage shadow
    // root and labels each by export name. Find the stage host (the only element
    // that gets a shadow root) and assert the export label landed inside it.
    await waitFor(() => {
      const hosts = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
        (el) => el.shadowRoot,
      );
      expect(hosts.length).toBeGreaterThan(0);
      expect(hosts.some((h) => h.shadowRoot?.textContent?.includes('Spinner'))).toBe(true);
    });
    // No MDX doc rendered: the only h1 is the page header (the component basename),
    // not a doc heading. The button doc, by contrast, sets the h1 to "Button".
    expect(container.querySelector('h1')?.textContent).toBe('spinner');
  });

  it('renders the 404 page for an unknown component name', () => {
    const { container } = renderAt('/components/does-not-exist');
    expect(within(container).getByText('Page not found')).toBeTruthy();
  });
});
