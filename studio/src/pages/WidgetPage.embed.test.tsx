// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// The Embed tab renders CdnBundlePreview, whose harness carries an inline
// script and a <script src> at the real loader.js. happy-dom would fetch and run
// them, so evaluation is disabled here — the same treatment CdnBundlePreview's own
// test uses. That is why this file is split from WidgetPage.test.tsx, which needs
// evaluation for the Dev tab's mount().
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, within, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { WidgetPage } from './WidgetPage';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  // Hermetic manifest: sermons released, example absent (so unreleased).
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ sermons: '1.4.3' }) }),
  );
});

function renderAt(path: string) {
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/widgets/:slug" element={<WidgetPage />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...utils, ui: within(utils.container) };
}

describe('WidgetPage — Embed tab', () => {
  it('defaults a released widget to Embed, with both tabs offered', async () => {
    const { ui } = renderAt('/widgets/sermons');
    // Waits for the manifest join (each released widget's module is imported).
    const embedTab = await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    expect(embedTab.getAttribute('aria-selected')).toBe('true');
    expect(ui.getByRole('tab', { name: 'Dev' }).getAttribute('aria-selected')).toBe('false');
    // The shipped-bundle frame and the copyable snippet are the point of this tab.
    expect(ui.getByTitle('Live widget: sermons')).toBeTruthy();
    expect(ui.getByRole('button', { name: /^copy$/i })).toBeTruthy();
  });

  it('shows the version and the Configure playground for a released widget', async () => {
    const { container, ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    expect(ui.getByText('v1.4.3')).toBeTruthy();
    expect(container.querySelector('[data-testid="config-playground"]')).toBeTruthy();
    expect(ui.getByRole('heading', { name: 'Configure' })).toBeTruthy();
  });

  // The snippet is what a non-developer came to copy. With it last it sat below a
  // schema-length options list — fifteen fields on community-group-finder — so it
  // moved further off-screen the more you configured.
  it('puts the embed snippet above the Configure options', async () => {
    const { container, ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    const snippet = ui.getByRole('heading', { name: 'Embed snippet' });
    const playground = container.querySelector('[data-testid="config-playground"]')!;
    expect(
      snippet.compareDocumentPosition(playground) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  // The snippet now sits ABOVE the controls that feed it, so "edit below, update
  // above" is the flow that has to keep working — a plain reorder can't break the
  // shared `overrides` state, but this is the behaviour the reorder was for.
  it('still updates the snippet from the Configure options below it', async () => {
    const { container, ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    const snippet = () => container.querySelector('pre')!.textContent ?? '';
    const playground = container.querySelector('[data-testid="config-playground"]')!;

    expect(snippet()).not.toContain('data-hide-series');
    // sermons' hide* booleans are all optional/off, so flipping one emits `true`.
    // Named rather than indexed so the test can't silently start driving a
    // different field if the schema's key order changes.
    const hideSeries = within(playground as HTMLElement)
      .getByText('hideSeries')
      .closest('label')!;
    fireEvent.click(within(hideSeries).getByRole('switch'));
    expect(snippet()).toContain('data-hide-series="true"');
  });

  describe('device width toggle', () => {
    const widths = { Phone: 375, Tablet: 768, Desktop: 1280 };

    it('offers icon-only phone/tablet/desktop buttons with accessible names', async () => {
      const { ui } = renderAt('/widgets/sermons');
      await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
      for (const [label, px] of Object.entries(widths)) {
        // Icon-only, so the name comes from aria-label — getByRole would not find
        // these at all if the label were dropped, which is the regression to catch.
        const button = ui.getByRole('button', { name: `${label} width (${px}px)` });
        expect(button.textContent).toBe('');
      }
    });

    it('starts on desktop and marks only the active device pressed', async () => {
      const { ui } = renderAt('/widgets/sermons');
      await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
      const pressed = () =>
        Object.entries(widths)
          .filter(
            ([label, px]) =>
              ui
                .getByRole('button', { name: `${label} width (${px}px)` })
                .getAttribute('aria-pressed') === 'true',
          )
          .map(([label]) => label);

      expect(pressed()).toEqual(['Desktop']);
      fireEvent.click(ui.getByRole('button', { name: 'Phone width (375px)' }));
      expect(pressed()).toEqual(['Phone']);
    });

    it('constrains the preview to the chosen width as a MAXIMUM', async () => {
      const { ui } = renderAt('/widgets/sermons');
      await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
      const frame = () => ui.getByTitle('Live widget: sermons').closest('[style]') as HTMLElement;

      // maxWidth, not width: desktop has to degrade to "as wide as there is room"
      // on a narrow pane rather than forcing a horizontal scrollbar.
      expect(frame().style.maxWidth).toBe('1280px');
      expect(frame().style.width).toBe('');

      fireEvent.click(ui.getByRole('button', { name: 'Tablet width (768px)' }));
      expect(frame().style.maxWidth).toBe('768px');
    });
  });

  it('switches to the Dev view when its tab is chosen', async () => {
    const { container, ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    fireEvent.click(ui.getByRole('tab', { name: 'Dev' }));
    expect(ui.getByRole('tab', { name: 'Dev' }).getAttribute('aria-selected')).toBe('true');
    // Embed's shipped-bundle frame is gone; the Dev view's controls are present.
    expect(ui.queryByTitle('Live widget: sermons')).toBeNull();
    expect(ui.getByRole('button', { name: /inspector/i })).toBeTruthy();
    expect(container.querySelector('[data-testid="config-playground"]')).toBeNull();
  });

  it('honours ?tab=dev on first load so a link can point at either view', async () => {
    const { ui } = renderAt('/widgets/sermons?tab=dev');
    const devTab = await ui.findByRole('tab', { name: 'Dev' }, { timeout: 10_000 });
    expect(devTab.getAttribute('aria-selected')).toBe('true');
    expect(ui.queryByTitle('Live widget: sermons')).toBeNull();
  });

  it('falls back to Embed when ?tab names something that does not exist', async () => {
    const { ui } = renderAt('/widgets/sermons?tab=nonsense');
    const embedTab = await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    expect(embedTab.getAttribute('aria-selected')).toBe('true');
  });

  it('does not claim "not released" while the manifest is still in flight', async () => {
    // On a cold dev server the catalog join imports every released widget's
    // module, which takes seconds — long enough that a released widget was
    // briefly labelled "not released". `released` is not authoritative until the
    // fetch resolves, so the label must wait rather than assert the opposite.
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    const { ui } = renderAt('/widgets/sermons');
    // The Dev view is available immediately (source exists), so the page renders
    // rather than blocking on the network — but it stays silent about release
    // state.
    await ui.findByRole('button', { name: /inspector/i }, { timeout: 10_000 });
    expect(ui.queryByText('not released')).toBeNull();
    expect(ui.queryByText(/^v\d/)).toBeNull();
  });

  // The MDX doc body used to render below the tabs. It is gone: everything it told
  // an embedder is already on this page — the snippet block is generated live and
  // the Configure panel lists every option with its description and default, both
  // from the widget's own zod schema. sermons had the worst of it at 233 lines.
  it('renders no doc body below the tabs', async () => {
    const { container, ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    expect(container.querySelector('section.border-t')).toBeNull();
    expect(container.querySelector('article')).toBeNull();
    // The doc's own H1 was the widget slug — the heading this removes.
    expect(ui.queryByRole('heading', { name: 'sermons' })).toBeNull();
  });

  // Removing the body must not take the one-line description with it: that comes
  // from the same MDX files' `description:` frontmatter, via widgetDescription.
  it('keeps the widget description under the title', async () => {
    const { ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    expect(ui.getByRole('heading', { level: 1, name: 'Sermons' })).toBeTruthy();
  });
});
