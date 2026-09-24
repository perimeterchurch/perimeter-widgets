/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SermonTabs } from '../../src/components/SermonTabs';

/**
 * The sermons/series tab row uses the shared `@perimeter/ui` SegmentedTabs
 * control in its `underline` variant (a `role="tablist"` of `role="tab"`
 * buttons, a brand-blue bar under the active one) — the same control as the
 * sermon detail's media tabs. These tests assert the selected-state markers and
 * that clicking a tab reports the change; the actual contrast is covered by the
 * Playwright visual harness.
 */
describe('SermonTabs order', () => {
  it('lists Series first, then Sermons', () => {
    render(<SermonTabs activeTab="series" onTabChange={() => {}} />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Series', 'Sermons']);
  });
});

describe('SermonTabs selected state', () => {
  it('renders a tablist with both tabs and marks exactly the active one', () => {
    render(<SermonTabs activeTab="sermons" onTabChange={() => {}} />);

    expect(screen.getByRole('tablist', { name: 'Series and sermons' })).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Sermons');
  });

  it('marks the series tab active when activeTab is "series"', () => {
    render(<SermonTabs activeTab="series" onTabChange={() => {}} />);

    const active = screen
      .getAllByRole('tab')
      .filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent('Series');
  });

  it('reports the tab id on click', () => {
    const onTabChange = vi.fn();
    render(<SermonTabs activeTab="sermons" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Series' }));
    expect(onTabChange).toHaveBeenCalledWith('series');
  });
});
