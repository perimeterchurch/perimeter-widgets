import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SortSelect, type SortFieldOption } from '../src/sort-select';

const fields: SortFieldOption[] = [
  { value: 'date', label: 'Date', icon: null },
  { value: 'title', label: 'Title', icon: null },
];

describe('SortSelect', () => {
  it('renders the active field label in the trigger', () => {
    render(
      <SortSelect
        sortField="date"
        sortDirection="asc"
        onSortFieldChange={() => {}}
        onSortDirectionChange={() => {}}
        fields={fields}
      />,
    );
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('opens the menu and exposes the direction options when clicked', () => {
    render(
      <SortSelect
        sortField="date"
        sortDirection="asc"
        onSortFieldChange={() => {}}
        onSortDirectionChange={() => {}}
        fields={fields}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]!);
    expect(screen.getByText('Ascending')).toBeInTheDocument();
    expect(screen.getByText('Descending')).toBeInTheDocument();
  });

  it('caps the popup width so it cannot clip on narrow widths', () => {
    const { container } = render(
      <SortSelect
        sortField="date"
        sortDirection="asc"
        onSortFieldChange={() => {}}
        onSortDirectionChange={() => {}}
        fields={fields}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[0]!);
    // the popup keeps right-0 anchoring but is width-capped to the viewport
    const popup = container.querySelector('.max-w-\\[calc\\(100vw-1rem\\)\\]');
    expect(popup).not.toBeNull();
    expect(popup).toHaveClass('right-0');
  });

  it('truncates the trigger label so it cannot overflow the row', () => {
    const { container } = render(
      <SortSelect
        sortField="date"
        sortDirection="asc"
        onSortFieldChange={() => {}}
        onSortDirectionChange={() => {}}
        fields={fields}
      />,
    );
    expect(container.querySelector('.truncate')).not.toBeNull();
  });
});

describe('SortSelect compact', () => {
  it('shows the "Sort by:" prefix by default', () => {
    render(
      <SortSelect
        sortField="date"
        sortDirection="desc"
        fields={fields}
        onSortFieldChange={() => {}}
        onSortDirectionChange={() => {}}
      />,
    );
    expect(screen.getByText(/Sort by:/)).toBeTruthy();
  });
  it('drops the prefix when compact (icon + value only)', () => {
    render(
      <SortSelect
        compact
        sortField="date"
        sortDirection="desc"
        fields={fields}
        onSortFieldChange={() => {}}
        onSortDirectionChange={() => {}}
      />,
    );
    expect(screen.queryByText(/Sort by:/)).toBeNull();
    expect(screen.getByText('Date')).toBeTruthy();
  });
});
