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
});
