// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ComponentPage } from './ComponentPage';
import { ComponentPreview } from '../components/ComponentPreview';

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
    // 10s, not waitFor's 1s default: this awaits a real lazy MDX import, which
    // exceeds a second on a 2-core CI runner. Same reason across this file.
    await waitFor(
      () => {
        expect(scope.getByText(/A clickable action\./)).toBeTruthy();
      },
      { timeout: 10_000 },
    );
    // The doc owns the page heading: the MDX `# Button` maps to the single
    // studio-styled h1 (no redundant chrome header above it).
    expect(container.querySelector('h1')?.textContent).toBe('Button');
  });

  it('renders the input doc with a live Example (no unmapped-component throw)', async () => {
    const { container } = renderAt('/components/input');
    const scope = within(container);

    // Text unique to docs/components/input.mdx — proves the MDX chunk rendered.
    await waitFor(
      () => {
        expect(scope.getByText(/A single-line text field\./)).toBeTruthy();
      },
      { timeout: 10_000 },
    );
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

    await waitFor(
      () => {
        expect(scope.getByText(/A set of layered sections/)).toBeTruthy();
      },
      { timeout: 10_000 },
    );
    expect(container.querySelector('h1')?.textContent).toBe('Tabs');
    const hosts = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
      (el) => el.shadowRoot,
    );
    expect(hosts.length).toBeGreaterThan(0);
  });

  it('auto-gallery renders a docless component by mounting its exports in a shadow root', async () => {
    // The doc→MDX routing is covered above (button/input/tabs). Every shipped
    // component now has a doc, so the gallery fallback only fires for a freshly
    // scaffolded component before its doc lands — exercise that path directly via
    // ComponentPreview (what ComponentPage's `else` branch renders) with a
    // synthetic docless entry. It must mount the discovered exports inside a
    // ComponentStage shadow root, labelled by export name.
    const { container } = render(
      <ComponentPreview
        entry={{
          name: 'spinner',
          load: () => import('@perimeter/ui/spinner') as Promise<Record<string, unknown>>,
        }}
      />,
    );

    await waitFor(() => {
      const hosts = Array.from(container.querySelectorAll<HTMLElement>('div')).filter(
        (el) => el.shadowRoot,
      );
      expect(hosts.length).toBeGreaterThan(0);
      expect(hosts.some((h) => h.shadowRoot?.textContent?.includes('Spinner'))).toBe(true);
    });
  });

  it('renders the 404 page for an unknown component name', () => {
    const { container } = renderAt('/components/does-not-exist');
    expect(within(container).getByText('Page not found')).toBeTruthy();
  });
});
