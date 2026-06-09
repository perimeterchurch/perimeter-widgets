/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedTabs, segmentedTabId } from '../src/segmented-tabs';

const ITEMS = [
  { id: 'one', label: 'One' },
  { id: 'two', label: 'Two' },
  { id: 'three', label: 'Three' },
];

describe('SegmentedTabs', () => {
  it('renders a tablist of tabs and marks exactly the selected one', () => {
    render(<SegmentedTabs items={ITEMS} value="two" onChange={() => {}} aria-label="Sections" />);

    const tablist = screen.getByRole('tablist', { name: 'Sections' });
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);

    const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Two');
  });

  it('roving tabIndex: only the selected tab is in the tab order', () => {
    render(<SegmentedTabs items={ITEMS} value="two" onChange={() => {}} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabindex', '-1');
    expect(tabs[1]).toHaveAttribute('tabindex', '0');
    expect(tabs[2]).toHaveAttribute('tabindex', '-1');
  });

  it('click selects a tab', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="one" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Three' }));
    expect(onChange).toHaveBeenCalledWith('three');
  });

  it('ArrowRight moves selection + focus to the next tab', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="one" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'One' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('two');
  });

  it('ArrowLeft moves selection + focus to the previous tab', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="two" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Two' }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('one');
  });

  it('ArrowRight wraps from the last tab to the first', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="three" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Three' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('one');
  });

  it('ArrowLeft wraps from the first tab to the last', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="one" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'One' }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('three');
  });

  it('Home jumps to the first tab and End jumps to the last', () => {
    const onChange = vi.fn();
    render(<SegmentedTabs items={ITEMS} value="two" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Two' }), { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('one');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Two' }), { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('three');
  });

  it('wires aria-controls + panel-labelling ids when panelId/idBase are given', () => {
    // The single-panel association the studio inspector needs: every tab points at
    // the shared panel via aria-controls, and segmentedTabId(idBase, value) yields
    // the active tab's DOM id so the panel can set aria-labelledby back at it.
    render(
      <SegmentedTabs
        items={ITEMS}
        value="two"
        onChange={() => {}}
        idBase="insp"
        panelId="insp-panel"
      />,
    );
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).toHaveAttribute('aria-controls', 'insp-panel');
    }
    const active = screen.getByRole('tab', { name: 'Two' });
    expect(active.id).toBe(segmentedTabId('insp', 'two'));
  });

  it('omits aria-controls when no panelId is given (sibling-view tabs)', () => {
    render(<SegmentedTabs items={ITEMS} value="one" onChange={() => {}} />);
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).not.toHaveAttribute('aria-controls');
    }
  });

  it('moves DOM focus to the newly-selected tab on arrow nav', () => {
    // Controlled: re-render with the new value so roving tabIndex updates, then
    // assert the focused element is the adjacent tab (focus follows selection).
    const onChange = vi.fn();
    const { rerender } = render(<SegmentedTabs items={ITEMS} value="one" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'One' }), { key: 'ArrowRight' });
    rerender(<SegmentedTabs items={ITEMS} value="two" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus();
  });
});
