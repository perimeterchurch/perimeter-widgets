/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { Calendar, Type } from 'lucide-react';
import { ResultsToolbar } from '../../src/components/ui/ResultsToolbar';
import { ResultsPagination } from '../../src/components/ui/ResultsPagination';

/**
 * Shared results-header (count + sort + view) and pager extract (Task 12).
 * jsdom can't measure layout, so we assert structure + handler wiring, not
 * geometry. The toolbar wrap behaviour is verified by class presence, not by
 * a rendered reflow.
 */

const SORT_FIELDS = [
  { value: 'date', label: 'Date', icon: <Calendar /> },
  { value: 'title', label: 'Title', icon: <Type /> },
];
const VIEW_OPTIONS = [
  { value: 'grid', label: 'Grid', icon: <Calendar /> },
  { value: 'list', label: 'List', icon: <Type /> },
];

function renderToolbar(over: Partial<Parameters<typeof ResultsToolbar>[0]> = {}) {
  return render(
    <ResultsToolbar
      count={42}
      noun="sermons"
      sortField="date"
      sortDirection="desc"
      sortFields={SORT_FIELDS}
      onSortFieldChange={vi.fn()}
      onSortDirectionChange={vi.fn()}
      viewMode="grid"
      viewOptions={VIEW_OPTIONS}
      onViewModeChange={vi.fn()}
      {...over}
    />,
  );
}

describe('ResultsToolbar', () => {
  it('renders the count with the noun', () => {
    const { container } = renderToolbar({ count: 42, noun: 'sermons' });
    const countLine = container.querySelector('[data-slot="results-count"]') as HTMLElement;
    expect(countLine).toBeInTheDocument();
    expect(countLine).toHaveTextContent('42 sermons');
  });

  it('reserves the count line (renders a placeholder) when count is null', () => {
    const { container } = renderToolbar({ count: null });
    const countLine = container.querySelector('[data-slot="results-count"]') as HTMLElement;
    // Always occupies a line so the row does not reflow when results arrive.
    expect(countLine).toBeInTheDocument();
    expect(countLine).not.toHaveTextContent(/sermons/);
  });

  it('wraps at narrow container widths (flex-wrap on the row)', () => {
    const { container } = renderToolbar();
    const row = container.querySelector('[data-slot="results-toolbar"]') as HTMLElement;
    expect(row.className).toContain('flex-wrap');
  });

  it('forwards a view-mode change from the view control', () => {
    const onViewModeChange = vi.fn();
    const { container } = renderToolbar({ onViewModeChange });
    const toolbar = container.querySelector('[data-slot="results-toolbar"]') as HTMLElement;
    // Open the view IconSelect (its trigger carries the "View:" label), then pick "List".
    fireEvent.click(within(toolbar).getByText('View:'));
    fireEvent.click(within(toolbar).getByText('List'));
    expect(onViewModeChange).toHaveBeenCalledWith('list');
  });
});

describe('ResultsPagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(
      <ResultsPagination page={1} totalPages={1} onPageChange={vi.fn()} label="x" />,
    );
    expect(container.querySelector('nav')).toBeNull();
  });

  it('drives the page source passed in as a prop (not an internal source)', () => {
    const onPageChange = vi.fn();
    const { getByText } = render(
      <ResultsPagination
        page={2}
        totalPages={5}
        onPageChange={onPageChange}
        label="Series pager"
      />,
    );
    fireEvent.click(getByText('4'));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('clamps previous/next to the bounds using the provided page', () => {
    const onPageChange = vi.fn();
    const { getByLabelText } = render(
      <ResultsPagination page={1} totalPages={5} onPageChange={onPageChange} label="pager" />,
    );
    fireEvent.click(getByLabelText(/go to previous page/i));
    // page 1 -> clamps to 1
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
