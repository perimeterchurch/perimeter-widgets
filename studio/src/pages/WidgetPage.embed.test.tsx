// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true } }
// The Embed tab renders CdnBundlePreview, whose iframe srcdoc carries an inline
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

  it('shows the version and the options playground for a released widget', async () => {
    const { container, ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    expect(ui.getByText('v1.4.3')).toBeTruthy();
    expect(container.querySelector('[data-testid="config-playground"]')).toBeTruthy();
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

  it('renders the widget doc below the tabs, not inside one', async () => {
    // The doc documents the widget whichever view you are in, and the options
    // reference wants to be readable while you tune the options above it.
    const { container, ui } = renderAt('/widgets/sermons');
    await ui.findByRole('tab', { name: 'Embed' }, { timeout: 10_000 });
    const tablist = container.querySelector('[role="tablist"]')!;
    const docSection = container.querySelector('section.border-t')!;
    expect(docSection).toBeTruthy();
    // Document order: the doc follows the tab strip rather than being nested in it.
    expect(tablist.contains(docSection)).toBe(false);
    expect(
      tablist.compareDocumentPosition(docSection) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
